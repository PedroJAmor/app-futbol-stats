"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatArgentinaDateTime } from "@/lib/dates";

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
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const found = text.match(/@partido(\d*)$/);
    if (!found) return void setSuggestions([]);
    fetch(`/api/mentions?query=${found[1]}`).then((response) => response.json()).then(setSuggestions);
  }, [text]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPublishing(true);
    setError("");
    const response = await fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, parentId, website }) });
    setPublishing(false);
    if (response.ok) { setText(""); setSuggestions([]); onPublished(); }
    else { const data = await response.json(); setError(data.error ?? "No se pudo publicar."); }
  }
  function insert(suggestion: Suggestion) {
    setText((current) => current.replace(/@partido\d*$/, suggestion.token));
    setSuggestions([]);
  }
  return <form className="stack forum-composer" onSubmit={submit}><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={parentId ? "Escribí tu respuesta..." : "¿Qué pasó en el partido? Escribí @partido para mencionar uno."} maxLength={1200} required autoFocus={Boolean(parentId)} /><input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} style={{ display: "none" }} /><div className="mention-suggestions">{suggestions.map((suggestion) => <button className="button" type="button" key={suggestion.token} onClick={() => insert(suggestion)}>{suggestion.label}</button>)}</div>{error && <p className="error">{error}</p>}<div className="row"><button className="button primary" type="submit" disabled={publishing}>{publishing ? "Publicando..." : parentId ? "Publicar respuesta" : "Publicar"}</button>{onCancel && <button className="button ghost" type="button" onClick={onCancel}>Cancelar</button>}</div></form>;
}

export default function ForumPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const load = () => fetch("/api/forum").then((response) => response.json()).then(setPosts);
  useEffect(() => { load(); }, []);
  const canModerate = session?.user.role === "ADMIN" || session?.user.role === "SUPERADMIN";
  return <div className="page forum-page"><section className="page-intro"><p className="eyebrow">La conversación sigue</p><h1>Foros</h1><p className="muted">Publicaciones anónimas del grupo.</p></section><section className="card"><Composer onPublished={load} /></section><div className="stack">{posts.map((post) => <PostItem key={post.id} post={post} onPublished={load} canModerate={canModerate} />)}</div></div>;
}

function PostItem({ post, onPublished, canModerate, nested = false }: { post: Post; onPublished: () => void; canModerate: boolean; nested?: boolean }) {
  const [replying, setReplying] = useState(false);
  const [confirmingModeration, setConfirmingModeration] = useState(false);
  const [moderating, setModerating] = useState(false);
  async function hidePost() {
    setModerating(true);
    const response = await fetch(`/api/forum/${post.id}`, { method: "DELETE" });
    setModerating(false);
    if (response.ok) { setConfirmingModeration(false); onPublished(); }
  }
  return <article className={`forum-post ${nested ? "forum-reply" : "card"}`}><div className="forum-meta"><span>{nested ? "Respuesta anónima" : "Publicación anónima"}</span><time dateTime={post.createdAt}>{formatArgentinaDateTime(post.createdAt)}</time></div><PostText post={post} /><div className="forum-actions"><button className="reply-button" type="button" onClick={() => setReplying((current) => !current)} aria-expanded={replying}>{replying ? "Cerrar respuesta" : "Responder"}</button>{canModerate && !post.deletedAt && <button className="moderate-button" type="button" onClick={() => setConfirmingModeration(true)}>Ocultar publicación</button>}</div>{replying && <div className="reply-composer"><Composer parentId={post.id} onCancel={() => setReplying(false)} onPublished={() => { setReplying(false); onPublished(); }} /></div>}{post.replies?.map((reply) => <PostItem key={reply.id} post={reply} onPublished={onPublished} canModerate={canModerate} nested />)}{confirmingModeration && <div className="modal-backdrop" role="presentation"><section className="modal card moderation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`moderation-title-${post.id}`}><h2 id={`moderation-title-${post.id}`}>¿Ocultar publicación?</h2><p>La publicación dejará de estar visible para todos. Esta acción es importante y sólo debe usarse para moderar contenido.</p><div className="row spread"><button className="button" type="button" disabled={moderating} onClick={() => setConfirmingModeration(false)}>Cancelar</button><button className="button danger" type="button" disabled={moderating} onClick={() => void hidePost()}>{moderating ? "Ocultando..." : "Sí, ocultar"}</button></div></section></div>}</article>;
}
