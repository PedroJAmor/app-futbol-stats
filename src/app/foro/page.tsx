"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatArgentinaDateTime } from "@/lib/dates";
import { getMatchMentionTrigger, replaceMatchMentionTrigger } from "@/features/forum/mention-trigger";

type Mention = { token: string; labelSnapshot: string; match: { id: number; isHidden: boolean } | null };
type Post = { id: string; text: string; createdAt: string; deletedAt: string | null; mentions: Mention[]; replies: Post[] };
type Suggestion = { id: number; token: string; label: string };

function PostText({ post }: { post: Post }) {
  const mentions = new Map(post.mentions.map((mention) => [mention.token, mention]));
  const parts = post.text.split(/(@\[match:\d+:tkn_[a-zA-Z0-9_-]+\])/g);
  return <p>{parts.map((part, index) => {
    const mention = mentions.get(part.replace(/^@\[match:\d+:/, "").replace(/\]$/, ""));
    if (!mention) return <span key={index}>{part}</span>;
    return mention.match && !mention.match.isHidden ? <Link key={index} className="pill" href={`/partidos/${mention.match.id}`}>{mention.labelSnapshot}</Link> : <span key={index} className="pill">{mention.labelSnapshot}</span>;
  })}</p>;
}

function Composer({ parentId, onPublished, onCancel }: { parentId?: string; onPublished: () => void; onCancel?: () => void }) {
  const [text, setText] = useState("");
  const [website, setWebsite] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publishingRef = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const trigger = getMatchMentionTrigger(text);
    if (!trigger) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    const controller = new AbortController();
    setLoadingSuggestions(true);
    fetch(`/api/mentions?query=${encodeURIComponent(trigger.query)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar los partidos");
        return response.json();
      })
      .then(setSuggestions)
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name !== "AbortError") setSuggestions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      });
    return () => controller.abort();
  }, [text]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, parentId, website }) });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo publicar.");
      }
      setText("");
      setSuggestions([]);
      onPublished();
    } catch (failure) {
      setError(failure instanceof TypeError ? "No se pudo conectar. Tu mensaje sigue acá para volver a intentar." : failure instanceof Error ? failure.message : "No se pudo publicar. Volvé a intentar.");
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }
  function insert(suggestion: Suggestion) {
    setText((current) => replaceMatchMentionTrigger(current, suggestion.token));
    setSuggestions([]);
  }
  return <form className="stack forum-composer" onSubmit={submit}><textarea disabled={publishing} value={text} onChange={(event) => setText(event.target.value)} placeholder={parentId ? "Escribí tu respuesta..." : "¿Qué pasó en el partido? Escribí @ para mencionar uno."} maxLength={1200} required autoFocus={Boolean(parentId)} /><input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} style={{ display: "none" }} />{(loadingSuggestions || suggestions.length > 0) && <div className="mention-suggestions" aria-live="polite">{loadingSuggestions && <p className="muted">Buscando partidos...</p>}{suggestions.map((suggestion) => <button className="button" disabled={publishing} type="button" key={suggestion.token} onClick={() => insert(suggestion)}>{suggestion.label}</button>)}</div>}{error && <p className="error" role="alert">{error}</p>}<div className="row"><button className="button primary" type="submit" disabled={publishing}>{publishing ? "Publicando..." : parentId ? "Publicar respuesta" : "Publicar"}</button>{onCancel && <button className="button ghost" type="button" disabled={publishing} onClick={onCancel}>Cancelar</button>}</div></form>;
}

export default function ForumPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const load = () => {
    setLoadError(false);
    return fetch("/api/forum").then((response) => {
      if (!response.ok) throw new Error("No se pudo cargar el foro");
      return response.json();
    }).then(setPosts).catch(() => setLoadError(true)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const canModerate = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  return <div className="page forum-page"><section className="forum-write stack"><div className="page-intro"><h2>La conversación sigue</h2><p className="muted">Publicaciones anónimas del grupo.</p></div><div className="card"><Composer onPublished={load} /></div></section><section className="forum-feed stack"><h2>Conversaciones</h2>{loading && <p className="muted" role="status">Cargando conversaciones...</p>}{loadError && <div className="stack"><p className="error" role="alert">No se pudieron cargar las conversaciones.</p><button className="button" type="button" onClick={() => void load()}>Reintentar</button></div>}{!loading && !loadError && posts.length === 0 && <div className="empty-state"><h3>La cancha queda abierta</h3><p className="muted">Todavía no hay publicaciones. Compartí la primera anécdota del grupo.</p></div>}{posts.map((post) => <PostItem key={post.id} post={post} onPublished={load} canModerate={canModerate} />)}</section></div>;
}

function PostItem({ post, onPublished, canModerate, nested = false }: { post: Post; onPublished: () => void; canModerate: boolean; nested?: boolean }) {
  const [replying, setReplying] = useState(false);
  const [confirmingModeration, setConfirmingModeration] = useState(false);
  const [moderating, setModerating] = useState(false);
  const moderatingRef = useRef(false);
  const [moderationError, setModerationError] = useState("");
  async function hidePost() {
    if (moderatingRef.current) return;
    moderatingRef.current = true;
    setModerating(true);
    setModerationError("");
    try {
      const response = await fetch(`/api/forum/${post.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No se pudo ocultar la publicación.");
      }
      setConfirmingModeration(false);
      onPublished();
    } catch (failure) {
      setModerationError(failure instanceof TypeError ? "No se pudo conectar. Volvé a intentar." : failure instanceof Error ? failure.message : "No se pudo ocultar la publicación.");
    } finally {
      moderatingRef.current = false;
      setModerating(false);
    }
  }
  return <article className={`forum-post ${nested ? "forum-reply" : "card"}`}><div className="forum-meta"><span>{nested ? "Respuesta anónima" : "Publicación anónima"}</span><time dateTime={post.createdAt}>{formatArgentinaDateTime(post.createdAt)}</time></div><PostText post={post} /><div className="forum-actions">{!post.deletedAt && <button className="reply-button" type="button" onClick={() => setReplying((current) => !current)} aria-expanded={replying}>{replying ? "Cerrar respuesta" : "Responder"}</button>}{canModerate && !post.deletedAt && <button className="moderate-button" type="button" onClick={() => { setModerationError(""); setConfirmingModeration(true); }}>Ocultar publicación</button>}</div>{replying && !post.deletedAt && <div className="reply-composer"><Composer parentId={post.id} onCancel={() => setReplying(false)} onPublished={() => { setReplying(false); onPublished(); }} /></div>}{post.replies?.map((reply) => <PostItem key={reply.id} post={reply} onPublished={onPublished} canModerate={canModerate} nested />)}{confirmingModeration && <div className="modal-backdrop" role="presentation"><section className="modal card moderation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`moderation-title-${post.id}`}><h2 id={`moderation-title-${post.id}`}>¿Ocultar publicación?</h2><p>La publicación dejará de estar visible para todos. Esta acción es importante y sólo debe usarse para moderar contenido.</p>{moderationError && <p className="error" role="alert">{moderationError}</p>}<div className="row spread"><button className="button" type="button" disabled={moderating} onClick={() => setConfirmingModeration(false)}>Cancelar</button><button className="button danger" type="button" disabled={moderating} onClick={() => void hidePost()}>{moderating ? "Ocultando..." : "Sí, ocultar"}</button></div></section></div>}</article>;
}
