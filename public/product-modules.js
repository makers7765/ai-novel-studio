// Product modules: independent novel projects, story memory, timeline and reusable materials.
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const WORKSPACE_KEY="novelStudioV2Workspace";
 const clone=value=>JSON.parse(JSON.stringify(value));
 const ensureArrays=book=>{
   book.memoryEntries=Array.isArray(book.memoryEntries)?book.memoryEntries:[];
   book.timelineEvents=Array.isArray(book.timelineEvents)?book.timelineEvents:[];
   book.materials=Array.isArray(book.materials)?book.materials:[];
   book.chapters=Array.isArray(book.chapters)?book.chapters:[];
   book.characters=Array.isArray(book.characters)?book.characters:[];
   book.worldEntries=Array.isArray(book.worldEntries)?book.worldEntries:[];
   book.archive=Array.isArray(book.archive)?book.archive:[];
   return book;
 };
 let workspace;
 try{workspace=JSON.parse(localStorage.getItem(WORKSPACE_KEY)||"null");}catch{workspace=null;}
 if(!workspace||!Array.isArray(workspace.projects)||!workspace.projects.length){
   const initial=ensureArrays(clone(data));
   const project={id:"novel-"+Date.now(),name:initial.title||"我的第一本小说",data:initial,taskDrafts:(()=>{try{return JSON.parse(localStorage.getItem("novelStudioV2TaskDrafts")||"{}");}catch{return {};}})(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   workspace={activeId:project.id,projects:[project]};
 }else{
   workspace.projects=workspace.projects.filter(p=>p&&p.id&&p.data);
   if(!workspace.projects.length){const initial=ensureArrays(clone(data));const p={id:"novel-"+Date.now(),name:initial.title||"我的第一本小说",data:initial,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};workspace={activeId:p.id,projects:[p]};}
   if(!workspace.projects.some(p=>p.id===workspace.activeId))workspace.activeId=workspace.projects[0].id;
   const active=workspace.projects.find(p=>p.id===workspace.activeId);
   data=ensureArrays({...defaultData,...clone(active.data)});
   try{localStorage.setItem("novelStudioV2",JSON.stringify(data));if(active.taskDrafts){localStorage.setItem("novelStudioV2TaskDrafts",JSON.stringify(active.taskDrafts));if(typeof taskDrafts!=="undefined")taskDrafts={...active.taskDrafts};}}catch{}
 }
 const activeProject=()=>workspace.projects.find(p=>p.id===workspace.activeId)||workspace.projects[0];
 function saveWorkspace(){
   const p=activeProject();if(!p)return;
   p.name=data.title||p.name||"未命名作品";p.data=clone(ensureArrays(data));p.updatedAt=new Date().toISOString();
   try{if(typeof taskDrafts!=="undefined")p.taskDrafts=clone(taskDrafts);localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}
   catch(e){const status=$("saveStatus");if(status)status.textContent="项目数据保存空间不足，请先导出备份。";}
 }
 const originalPersist=persist;
 persist=function(){originalPersist();saveWorkspace();};
 const originalContextParts=contextParts;
 contextParts=function(){
   const base=originalContextParts();
   return {...base,
     memory:"小说记忆库：\n"+(data.memoryEntries.map(x=>"["+x.type+"] "+x.title+"："+x.content).join("\n")||"暂无"),
     timeline:"剧情时间线：\n"+(data.timelineEvents.map(x=>x.date+" · "+x.title+"："+x.content).join("\n")||"暂无"),
     materials:"素材库：\n"+(data.materials.map(x=>"["+x.category+"] "+x.title+"："+x.content).join("\n")||"暂无")
   };
 };
 function switchPage(name){
   document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
   document.querySelectorAll("main section").forEach(s=>s.classList.add("hidden"));
   const page=$("page-"+name);if(page)page.classList.remove("hidden");
   $("nav").classList.remove("mobile-open");$("mobileNavToggle").setAttribute("aria-expanded","false");$("mobileNavToggle").textContent="☰ 打开导航菜单";
 }
 function renderProjects(){
   const list=$("novelProjectList"),overview=$("projectOverview");if(!list||!overview)return;
   const totalWords=workspace.projects.reduce((sum,p)=>sum+(p.data.chapters||[]).reduce((n,c)=>n+(c.body||"").length,0),0);
   overview.innerHTML="";
   [{n:workspace.projects.length,l:"小说项目"},{n:workspace.projects.reduce((n,p)=>n+(p.data.chapters||[]).length,0),l:"已写章节"},{n:totalWords.toLocaleString(),l:"累计正文字符"}].forEach(m=>{const el=document.createElement("div");el.className="metric-card";const v=document.createElement("strong");v.textContent=m.n;const l=document.createElement("span");l.textContent=m.l;el.append(v,l);overview.append(el);});
   list.innerHTML="";
   workspace.projects.forEach(p=>{
     const book=ensureArrays(p.data);const card=document.createElement("article");card.className="project-card"+(p.id===workspace.activeId?" active-project":"");
     const h=document.createElement("h3");h.textContent=p.name||"未命名小说";
     const desc=document.createElement("p");desc.textContent=(book.synopsis||"尚未填写小说简介").slice(0,100);
     const stats=document.createElement("div");stats.className="project-stats";stats.textContent=book.chapters.length+" 章 · "+book.characters.length+" 人物 · "+book.worldEntries.length+" 条世界设定";
     const actions=document.createElement("div");actions.className="actions";
     const open=document.createElement("button");open.className="primary";open.textContent=p.id===workspace.activeId?"当前项目":"打开项目";open.disabled=p.id===workspace.activeId;open.onclick=()=>activateProject(p.id);
     const rename=document.createElement("button");rename.textContent="重命名";rename.onclick=()=>{const next=prompt("请输入小说项目名称",p.name);if(!next||!next.trim())return;p.name=next.trim();if(p.id===workspace.activeId){data.title=p.name;$("bookTitle").value=p.name;persist();}else{try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}catch{}}renderProjects();};
     const remove=document.createElement("button");remove.textContent="删除";remove.disabled=workspace.projects.length<=1;remove.onclick=()=>{if(!confirm("确定删除项目“"+p.name+"”？此操作会删除该项目在本浏览器中的资料，请先导出备份。"))return;workspace.projects=workspace.projects.filter(x=>x.id!==p.id);if(workspace.activeId===p.id){workspace.activeId=workspace.projects[0].id;loadActiveProject();}try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}catch{}renderProjects();};
     actions.append(open,rename,remove);card.append(h,desc,stats,actions);list.append(card);
   });
 }
 function loadActiveProject(){
   const p=activeProject();if(!p)return;
   data=ensureArrays({...defaultData,...clone(p.data)});
   try{localStorage.setItem("novelStudioV2",JSON.stringify(data));localStorage.setItem("novelStudioV2TaskDrafts",JSON.stringify(p.taskDrafts||{}));if(typeof taskDrafts!=="undefined"){taskDrafts={...(p.taskDrafts||{})};}}
   catch{}
   if($("bookTitle"))$("bookTitle").value=data.title||p.name||"";
   if(typeof load==="function")load();
   if(typeof renderTaskFields==="function"&&typeof currentTask!=="undefined")renderTaskFields(currentTask);
   if(typeof renderVersions==="function")renderVersions();
   if(typeof refreshContextPreview==="function")refreshContextPreview();
   renderMemory();renderTimeline();renderMaterials();renderProjects();
 }
 function activateProject(id){
   if(id===workspace.activeId)return;
   saveWorkspace();workspace.activeId=id;loadActiveProject();switchPage("studio");
   const st=$("saveStatus");if(st)st.textContent="已切换项目："+(data.title||"未命名作品")+" · 自动保存已开启";
 }
 $("createNovelProject")?.addEventListener("click",()=>{
   const name=prompt("给新小说起个名字","我的新小说");if(!name||!name.trim())return;
   saveWorkspace();const p={id:"novel-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name:name.trim(),data:ensureArrays({...defaultData,title:name.trim()}),taskDrafts:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   workspace.projects.push(p);workspace.activeId=p.id;loadActiveProject();switchPage("studio");
 });
 function recordCard(item,meta,actions){
   const card=document.createElement("article");card.className="record-card";
   const h=document.createElement("h3");h.textContent=item.title||"未命名条目";
   const m=document.createElement("div");m.className="record-meta";m.textContent=meta;
   const p=document.createElement("p");p.textContent=item.content||"";
   const row=document.createElement("div");row.className="record-actions";actions.forEach(a=>{const b=document.createElement("button");b.type="button";b.textContent=a.label;b.onclick=a.run;row.append(b);});
   card.append(h,m,p,row);return card;
 }
 let editingMemory=-1;
 function renderMemory(){
   const box=$("memoryList");if(!box)return;box.innerHTML="";$("memoryCount").textContent=data.memoryEntries.length+" 条";
   if(!data.memoryEntries.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="还没有记忆条目。可以先添加人物状态、世界规则或重要伏笔。";box.append(empty);return;}
   data.memoryEntries.forEach((item,i)=>box.append(recordCard(item,item.type+" · "+(item.updatedAt||""),[
    {label:"编辑",run:()=>{editingMemory=i;$("memoryType").value=item.type;$("memoryTitle").value=item.title;$("memoryContent").value=item.content;$("saveMemory").textContent="更新记忆";$("memoryTitle").focus();}},
    {label:"删除",run:()=>{if(!confirm("确定删除这条记忆？"))return;data.memoryEntries.splice(i,1);persist();renderMemory();}}
   ])));
 }
 $("saveMemory")?.addEventListener("click",()=>{
   const title=$("memoryTitle").value.trim(),content=$("memoryContent").value.trim();if(!title||!content){alert("请填写记忆标题和详细内容。");return;}
   const item={type:$("memoryType").value,title,content,updatedAt:new Date().toLocaleString()};
   if(editingMemory<0)data.memoryEntries.push(item);else data.memoryEntries[editingMemory]=item;
   editingMemory=-1;$("memoryType").value="人物状态";$("memoryTitle").value="";$("memoryContent").value="";$("saveMemory").textContent="保存到记忆库";
   persist();renderMemory();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });
 function renderTimeline(){
   const box=$("timelineList");if(!box)return;box.innerHTML="";$("timelineCount").textContent=data.timelineEvents.length+" 个事件";
   if(!data.timelineEvents.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="还没有剧情事件。按故事发生顺序添加关键节点。";box.append(empty);return;}
   data.timelineEvents.forEach((item,i)=>box.append(recordCard(item,item.date+" · "+(item.updatedAt||""),[
    {label:"上移",run:()=>{if(i===0)return;[data.timelineEvents[i-1],data.timelineEvents[i]]=[data.timelineEvents[i],data.timelineEvents[i-1]];persist();renderTimeline();}},
    {label:"下移",run:()=>{if(i===data.timelineEvents.length-1)return;[data.timelineEvents[i+1],data.timelineEvents[i]]=[data.timelineEvents[i],data.timelineEvents[i+1]];persist();renderTimeline();}},
    {label:"删除",run:()=>{if(!confirm("确定删除该剧情事件？"))return;data.timelineEvents.splice(i,1);persist();renderTimeline();}}
   ])));
 }
 $("saveTimelineEvent")?.addEventListener("click",()=>{
   const date=$("eventDate").value.trim(),title=$("eventTitle").value.trim(),content=$("eventContent").value.trim();if(!date||!title){alert("请填写故事时间和事件名称。");return;}
   data.timelineEvents.push({date,title,content,updatedAt:new Date().toLocaleString()});
   $("eventDate").value="";$("eventTitle").value="";$("eventContent").value="";persist();renderTimeline();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });
 function renderMaterials(){
   const box=$("materialList");if(!box)return;box.innerHTML="";
   const q=($("materialSearch")?.value||"").trim().toLowerCase();
   const filtered=data.materials.map((x,i)=>({...x,_index:i})).filter(x=>!q||[x.title,x.category,x.content,(x.tags||[]).join(" ")].join(" ").toLowerCase().includes(q));
   $("materialCount").textContent=filtered.length+" / "+data.materials.length+" 条";
   if(!filtered.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent=q?"没有找到匹配素材。":"素材库还是空的，添加第一条灵感或参考资料吧。";box.append(empty);return;}
   filtered.forEach(item=>box.append(recordCard(item,item.category+" · "+(item.tags||[]).join("、"),[
    {label:"放入创作区",run:()=>{switchPage("studio");$("freeReference").value=item.content;$("freeInstruction").value="请参考这条素材进行创作："+item.title;}},
    {label:"删除",run:()=>{if(!confirm("确定删除这条素材？"))return;data.materials.splice(item._index,1);persist();renderMaterials();}}
   ])));
 }
 $("saveMaterial")?.addEventListener("click",()=>{
   const title=$("materialTitle").value.trim(),content=$("materialContent").value.trim();if(!title||!content){alert("请填写素材名称和内容。");return;}
   data.materials.push({category:$("materialCategory").value,title,content,tags:$("materialTags").value.split(/[,，]/).map(x=>x.trim()).filter(Boolean),createdAt:new Date().toLocaleString()});
   $("materialTitle").value="";$("materialContent").value="";$("materialTags").value="";persist();renderMaterials();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });
 $("materialSearch")?.addEventListener("input",renderMaterials);
 $("bookTitle")?.addEventListener("input",()=>{data.title=$("bookTitle").value;const p=activeProject();if(p){p.name=data.title||"未命名作品";p.data=clone(data);try{localStorage.setItem("novelStudioV2",JSON.stringify(data));localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}catch{}}});
 // Keep the project's data synchronized when existing app controls save it.
 const originalLoad=load;
 load=function(){originalLoad();renderMemory();renderTimeline();renderMaterials();renderProjects();};
 // Ensure switching to the new modules always shows their current data.
 document.querySelectorAll('.nav button[data-page]').forEach(button=>button.addEventListener("click",()=>{
   if(button.dataset.page==="projects")renderProjects();
   if(button.dataset.page==="memory")renderMemory();
   if(button.dataset.page==="timeline")renderTimeline();
   if(button.dataset.page==="library")renderMaterials();
 }));
 // Initialise project workspace without replacing the legacy single-project key.
 saveWorkspace();
 if(typeof load==="function")load();
 if(typeof renderTaskFields==="function"&&typeof currentTask!=="undefined")renderTaskFields(currentTask);
 if(typeof renderVersions==="function")renderVersions();
 if(typeof refreshContextPreview==="function")refreshContextPreview();
 if($("bookTitle"))$("bookTitle").value=data.title||activeProject().name||"";
 renderMemory();renderTimeline();renderMaterials();renderProjects();
})();
