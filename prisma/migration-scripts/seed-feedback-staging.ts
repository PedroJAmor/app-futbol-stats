import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertSafeStagingEnvironment } from "./guard-env";
import { suggestCategory } from "../../src/features/matches/categories";

const catalogue = [
  {name:"Rebote", courts:[{name:"F7",format:7,goals:["Estacionamiento","Pared"]},{name:"F5 Cancha 1",format:5,goals:["Estacionamiento","Pared"]},{name:"F5 Cancha 2",format:5,goals:["Cancha 1","Calle"]}]},
  {name:"La Avenida",courts:[{name:"F7",format:7,goals:["Buffet","Pared"]},{name:"F5",format:5,goals:["Buffet","Pared"]}]},
  {name:"Corner",courts:[{name:"Cancha 1",format:5,goals:["Buffet","Pared"]},{name:"Cancha 2",format:5,goals:["Buffet","Pared"]}]},
  {name:"La Estación",courts:[{name:"F7",format:7,goals:["Entrada","Arco 2"]}]},
  {name:"La Bosch",courts:[{name:"Betharram",format:5,goals:["Buffet","Calle"]},{name:"Santos Vega",format:5,goals:["Buffet","Calle"]}]},
];
const normalized = (name:string) => name.trim().replace(/\s+/g," ").toLocaleLowerCase("es-AR");
const hash = (id:number) => createHash("sha256").update(`friends-demo-2026-10-28-v1:${id}`).digest();
const directory = ".local-artifacts/friends-feedback";
const date = (value:Date) => new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(value);

async function main() {
  const safe = assertSafeStagingEnvironment();
  if(safe.host!=="ep-flat-dew-ac0jqcc0-pooler.sa-east-1.aws.neon.tech")throw new Error("Host de pruebas no confirmado");
  const db = new PrismaClient();
  mkdirSync(directory,{recursive:true});
  try {
    const rollbackIndex = process.argv.indexOf("--rollback");
    if(rollbackIndex>=0){
      const file=resolve(process.argv[rollbackIndex+1]??"");
      if(!file.startsWith(resolve(directory)+"/"))throw new Error("El manifiesto debe estar en el directorio de esta entrega");
      const journal=JSON.parse(readFileSync(file,"utf8"));
      if(journal.version!==1 || !Array.isArray(journal.changes) || journal.changes.length>10000)throw new Error("Manifiesto inválido");
      if(!process.argv.includes("--apply")){console.log(JSON.stringify({mode:"rollback-dry-run",records:journal.changes.length}));return;}
      let restored=0;
      await db.$transaction(async tx=>{
        for(const change of journal.changes){
          const current=await tx.match.findUnique({where:{id:change.id},include:{teams:true}});
          if(!current || current.updatedAt.toISOString()!==change.after.updatedAt || current.courtId!==change.after.courtId || current.category!==change.after.category || current.locationIsDemo!==change.after.locationIsDemo || current.format!==change.after.format || change.after.goals.some((g:any)=>current.teams.find(t=>t.id===g.id)?.defendedGoalId!==g.defendedGoalId))continue;
          const changed=await tx.match.updateMany({where:{id:change.id,updatedAt:current.updatedAt},data:{format:change.before.format,category:change.before.category,courtId:change.before.courtId,locationIsDemo:change.before.locationIsDemo}});
          if(changed.count!==1)throw new Error(`El partido #${change.id} cambió durante la reversión; no se aplicó la reversión`);
          for(const team of change.before.goals)await tx.matchTeam.update({where:{id:team.id},data:{defendedGoalId:team.defendedGoalId}});
          restored++;
        }
      },{timeout:30000,isolationLevel:"Serializable"});
      console.log(JSON.stringify({restored,skippedChangedSince:journal.changes.length-restored,cataloguePreserved:true}));return;
    }
    const rows=await db.match.findMany({where:{isHidden:false},orderBy:{id:"asc"},include:{venue:{select:{normalizedName:true}},teams:{orderBy:{side:"asc"},select:{id:true,defendedGoalId:true,_count:{select:{participations:true}}}}}});
    const corrected=rows.find(r=>r.id===46);
    if(!corrected || corrected.venue?.normalizedName!=="corner" || ![5,7].includes(corrected.format) || corrected.teams.length!==2 || corrected.teams.some(t=>t._count.participations!==5))throw new Error("La corrección #46 no coincide con los datos aprobados");
    const proposed=rows.map(row=>{
      const format=row.id===46?5:row.format;
      const options=catalogue.find(v=>normalized(v.name)===row.venue?.normalizedName)?.courts.filter(c=>c.format===format)??[];
      const canAssign=!row.courtId && row.teams.length===2 && row.teams.every(t=>t.defendedGoalId===null) && options.length>0;
      const choice=canAssign?options[hash(row.id)[0]%options.length]:null;
      return {id:row.id,category:row.category??suggestCategory(date(row.playedAt),format),format,venue:row.venue?.normalizedName,court:choice?.name??null,goalA:choice?.goals[hash(row.id)[1]%2]??null,assign:canAssign,previous:row};
    });
    const summary={matches:rows.length,newCategories:proposed.filter(r=>r.previous.category===null).length,randomLocations:proposed.filter(r=>r.assign).length,pendingLocation:proposed.filter(r=>!r.assign&&!r.previous.courtId).length,correct46:corrected.format===7,categories:proposed.reduce((counts,r)=>({...counts,[r.category]:(counts[r.category]??0)+1}),{} as Record<string,number>)};
    writeFileSync(`${directory}/seed-preview.json`,JSON.stringify({summary,catalogue,assignments:proposed.map(({previous,...p})=>p)},null,2));
    console.log(JSON.stringify({...summary,mode:process.argv.includes("--apply")?"apply":"dry-run"}));
    if(!process.argv.includes("--apply"))return;
    const file=`${directory}/seed-journal-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
    const journal:{version:number;at:string;applied:boolean;catalogue:typeof catalogue;created:any[];changes:any[]}={version:1,at:new Date().toISOString(),applied:false,catalogue,created:[],changes:[]};
    writeFileSync(file,JSON.stringify(journal,null,2));
    await db.$transaction(async tx=>{
      const venues=new Map<string,number>();
      for(const item of catalogue){
        const key=normalized(item.name);
        let venue=await tx.venue.findUnique({where:{normalizedName:key}});
        if(!venue){venue=await tx.venue.create({data:{name:item.name,normalizedName:key}});journal.created.push({kind:"venue",id:venue.id});}
        venues.set(key,venue.id);
        for(const c of item.courts){
          let court=await tx.court.findUnique({where:{venueId_normalizedName:{venueId:venue.id,normalizedName:normalized(c.name)}}});
          if(!court){court=await tx.court.create({data:{venueId:venue.id,name:c.name,normalizedName:normalized(c.name),format:c.format}});journal.created.push({kind:"court",id:court.id});}
          if(court.format!==c.format)throw new Error(`Formato diferente en ${item.name}/${c.name}; no se reemplaza`);
          for(let position=0;position<2;position++){
            const existing=await tx.goal.findUnique({where:{courtId_position:{courtId:court.id,position}}});
            if(!existing){const goal=await tx.goal.create({data:{courtId:court.id,position,name:c.goals[position]}});journal.created.push({kind:"goal",id:goal.id});}
          }
        }
      }
      // Catalogue entries are real supplied information. Rollback never deletes
      // them; only the synthetic assignments / classification / approved #46 fix.
      for(const p of proposed){
        const old=p.previous;
        const update:any={};
        if(old.category===null)update.category=p.category;
        if(old.format!==p.format)update.format=p.format;
        let goals=old.teams.map(t=>({id:t.id,defendedGoalId:t.defendedGoalId}));
        if(p.assign){
          const court=await tx.court.findUniqueOrThrow({where:{venueId_normalizedName:{venueId:venues.get(p.venue!)!,normalizedName:normalized(p.court!)}},include:{goals:{orderBy:{position:"asc"}}}});
          if(court.goals.length!==2)throw new Error("Par de arcos incompleto");
          update.courtId=court.id;update.locationIsDemo=true;
          const first=hash(p.id)[1]%2;
          goals=old.teams.map((t,index)=>({id:t.id,defendedGoalId:court.goals[index===0?first:1-first].id}));
        }
        if(!Object.keys(update).length)continue;
        const before={format:old.format,category:old.category,courtId:old.courtId,locationIsDemo:old.locationIsDemo,updatedAt:old.updatedAt.toISOString(),goals:old.teams.map(t=>({id:t.id,defendedGoalId:t.defendedGoalId}))};
        const changed=await tx.match.updateMany({where:{id:p.id,updatedAt:old.updatedAt},data:update});
        if(changed.count!==1)throw new Error(`El partido #${p.id} cambió durante la preparación; no se aplicó la carga`);
        for(const team of goals)await tx.matchTeam.update({where:{id:team.id},data:{defendedGoalId:team.defendedGoalId}});
        const saved=await tx.match.findUniqueOrThrow({where:{id:p.id}});
        journal.changes.push({id:p.id,before,after:{format:saved.format,category:saved.category,courtId:saved.courtId,locationIsDemo:saved.locationIsDemo,updatedAt:saved.updatedAt.toISOString(),goals}});
      }
      // Persist the exact before/after manifest before this transaction commits.
      writeFileSync(file,JSON.stringify(journal,null,2));
    },{timeout:60000,isolationLevel:"Serializable"});
    journal.applied=true;writeFileSync(file,JSON.stringify(journal,null,2));
    console.log(JSON.stringify({applied:journal.changes.length,created:journal.created.length,journal:file}));
  } finally {await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
