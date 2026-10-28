/** Completes only the staging locations authorized on 28/10/2026.
 * Default: dry run. --apply: serializable, optimistic writes + recoverable journal.
 * Never changes match format, date, results, participants or price.
 */
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { assertSafeStagingEnvironment } from './guard-env';
const directory='.local-artifacts/friends-feedback';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const random=(id:number,scope:string)=>parseInt(hash(['locations-2026-10-28-v2',id,scope]).slice(0,8),16);
const catalogue=[{name:'F11',format:11,goals:['Buffet','Calle']},{name:'F8',format:8,goals:['Buffet','Estudiantes']},{name:'F5',format:5,goals:['Buffet','Estudiantes']}];
async function main(){
 const safe=assertSafeStagingEnvironment();if(safe.host!=='ep-flat-dew-ac0jqcc0-pooler.sa-east-1.aws.neon.tech')throw Error('Host de pruebas no confirmado');
 const db=new PrismaClient();mkdirSync(directory,{recursive:true});
 const snapshot=()=>db.match.findMany({orderBy:{id:'asc'},select:{id:true,playedAt:true,format:true,priceCents:true,weather:true,temperature:true,notes:true,mvpId:true,category:true,isHidden:true,teams:{orderBy:{side:'asc'},select:{id:true,side:true,color:true,result:true,participations:{orderBy:{playerId:'asc'},select:{playerId:true}}}}}});
 try{
  const coreHash=hash(await snapshot());
  const rows=await db.match.findMany({where:{isHidden:false,OR:[{venueId:null},{format:11,courtId:null}]},orderBy:{id:'asc'},include:{teams:{orderBy:{side:'asc'}}}});
  const venues=await db.venue.findMany({include:{courts:{include:{goals:{orderBy:{position:'asc'}}}}}});
  const venue=(name:string)=>{const v=venues.find(v=>v.name.toLocaleLowerCase('es-AR')===name.toLocaleLowerCase('es-AR'));if(!v)throw Error(`Falta predio ${name}`);return v;};
  const plans=rows.map(row=>{
   const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short'}).format(row.playedAt);
   if(row.format===11){const target=venue('La Redonda');if(row.venueId&&row.venueId!==target.id)throw Error('F11 con otro predio; revisar');return {row,venueId:target.id,courtName:'F11',reason:'F11 confirmado por usuario'};}
   if(row.venueId!==null)return null;
   let name:string;
   if(weekday==='Sat'&&row.format===7)name='Rebote';
   else if(!['Sat','Sun'].includes(weekday)&&row.format===5)name=['La Bosch','Corner','Rebote'][random(row.id,'venue')%3];
   else if(!['Sat','Sun'].includes(weekday)&&row.format===7)name='Rebote';
   else return {row,pending:true,reason:`${weekday} F${row.format} fuera de la regla confirmada`};
   const target=venue(name),courts=target.courts.filter(c=>c.format===row.format);
   if(!courts.length)throw Error('Falta cancha compatible');
   return {row,venueId:target.id,courtName:courts[random(row.id,'court')%courts.length].name,reason:weekday==='Sat'?'Sábado F7 confirmado; arco de demostración':'Asignación aleatoria de demostración compatible'};
  }).filter(p=>p!==null);
  const summary={mode:process.argv.includes('--apply')?'apply':'dry-run',updates:plans.filter(p=>!p.pending).length,pending:plans.filter(p=>p.pending).map(p=>({id:p.row.id,reason:p.reason})),byVenue:plans.filter(p=>!p.pending).reduce((counts,p)=>{const name=venues.find(v=>v.id===p.venueId)!.name;counts[name]=(counts[name]??0)+1;return counts;},{} as Record<string,number>)};
  console.log(JSON.stringify(summary));if(!process.argv.includes('--apply'))return;
  const file=`${directory}/complete-locations-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
  const journal:any={version:1,at:new Date().toISOString(),coreHash,applied:false,created:[],changes:[],pending:summary.pending};
  writeFileSync(file,JSON.stringify(journal,null,2));
  await db.$transaction(async tx=>{
   const redonda=venue('La Redonda');
   for(const c of catalogue){
    let court=await tx.court.findUnique({where:{venueId_normalizedName:{venueId:redonda.id,normalizedName:c.name.toLowerCase()}}});
    if(!court){court=await tx.court.create({data:{venueId:redonda.id,name:c.name,normalizedName:c.name.toLowerCase(),format:c.format}});journal.created.push({courtId:court.id});}
    if(court.format!==c.format)throw Error('Formato existente incompatible');
    for(let position=0;position<2;position++){
     const goal=await tx.goal.findUnique({where:{courtId_position:{courtId:court.id,position}}});
     if(!goal){const saved=await tx.goal.create({data:{courtId:court.id,position,name:c.goals[position]}});journal.created.push({goalId:saved.id});}
     else if(goal.name.toLowerCase()!==c.goals[position].toLowerCase())throw Error('Arcos existentes diferentes; revisar');
    }
   }
   for(const p of plans){
    if(p.pending)continue;
    const row=p.row;
    if(row.courtId||row.teams.length!==2||row.teams.some(t=>t.defendedGoalId!==null))throw Error('Ubicación existente: no sobrescribir');
    const court=await tx.court.findUniqueOrThrow({where:{venueId_normalizedName:{venueId:p.venueId!,normalizedName:p.courtName!.toLowerCase()}},include:{goals:{orderBy:{position:'asc'}}}});
    if(court.format!==row.format||court.goals.length!==2)throw Error('Cancha/arcos incompatibles');
    const before={venueId:row.venueId,courtId:row.courtId,locationIsDemo:row.locationIsDemo,updatedAt:row.updatedAt,teams:row.teams.map(t=>({id:t.id,defendedGoalId:t.defendedGoalId}))};
    const saved=await tx.match.updateMany({where:{id:row.id,updatedAt:row.updatedAt,venueId:row.venueId,courtId:null},data:{venueId:p.venueId,courtId:court.id,locationIsDemo:true}});
    if(saved.count!==1)throw Error('Partido modificado durante la carga');
    const start=random(row.id,'goal')%2;
    for(let i=0;i<2;i++)await tx.matchTeam.update({where:{id:row.teams[i].id},data:{defendedGoalId:court.goals[(start+i)%2].id}});
    const after=await tx.match.findUniqueOrThrow({where:{id:row.id},select:{venueId:true,courtId:true,locationIsDemo:true,updatedAt:true,teams:{select:{id:true,defendedGoalId:true}}}});
    journal.changes.push({id:row.id,reason:p.reason,before,after});
   }
   writeFileSync(file,JSON.stringify(journal,null,2));
  },{isolationLevel:'Serializable',timeout:60000});
  journal.applied=true;writeFileSync(file,JSON.stringify(journal,null,2));
  if(hash(await snapshot())!==coreHash)throw Error('Cambió información ajena a ubicación; revisar manifiesto');
  console.log(JSON.stringify({applied:journal.changes.length,created:journal.created.length,coreDataUnchanged:true,journal:file}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
