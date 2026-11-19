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
   book.relationships=Array.isArray(book.relationships)?book.relationships:[];
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
   data=ensureArrays({...defaultData,...clone(active.data)});if(!data.title)data.title=active.name||"未命名作品";
   try{localStorage.setItem("novelStudioV2",JSON.stringify(data));if(active.taskDrafts){localStorage.setItem("novelStudioV2TaskDrafts",JSON.stringify(active.taskDrafts));if(typeof taskDrafts!=="undefined")taskDrafts={...active.taskDrafts};}}catch{}
 }
 const activeProject=()=>workspace.projects.find(p=>p.id===workspace.activeId)||workspace.projects[0];
 const originalVersionKey=versionKey;
 const legacyVersionKey=originalVersionKey();
 const scopedVersionKey=activeProject().id+"::"+legacyVersionKey;
 if(versionHistory[legacyVersionKey]&&!versionHistory[scopedVersionKey])versionHistory[scopedVersionKey]=versionHistory[legacyVersionKey];
 versionKey=function(){return activeProject().id+"::"+originalVersionKey();};
 const nativeStorageSet=Storage.prototype.setItem;
 Storage.prototype.setItem=function(key,value){nativeStorageSet.call(this,key,value);if(key==="novelStudioV2TaskDrafts"&&workspace){try{const p=activeProject();p.taskDrafts=JSON.parse(value||"{}");nativeStorageSet.call(this,WORKSPACE_KEY,JSON.stringify(workspace));}catch{}}};
 window.exportWorkspaceSnapshot=()=>clone(workspace);
 window.restoreWorkspaceSnapshot=snapshot=>{if(!snapshot||!Array.isArray(snapshot.projects)||!snapshot.projects.length)throw new Error("项目备份格式无效");workspace=clone(snapshot);if(!workspace.projects.some(p=>p.id===workspace.activeId))workspace.activeId=workspace.projects[0].id;const p=activeProject();data=ensureArrays({...defaultData,...clone(p.data)});if(typeof taskDrafts!=="undefined")taskDrafts={...(p.taskDrafts||{})};saveWorkspace();};
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
     memory:"小说记忆库：\n"+(data.memoryEntries.map(x=>"["+x.type+"] "+x.title+"："+x.content).join("\n")||"暂无")+"\n人物关系："+(data.relationships.map(x=>x.from+" —"+x.type+"→ "+x.to+(x.note?"（"+x.note+"）":"")).join("；")||"暂无"),
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
   data=ensureArrays({...defaultData,...clone(p.data)});activeChapter=null;
   try{localStorage.setItem("novelStudioV2",JSON.stringify(data));localStorage.setItem("novelStudioV2TaskDrafts",JSON.stringify(p.taskDrafts||{}));if(typeof taskDrafts!=="undefined"){taskDrafts={...(p.taskDrafts||{})};}}
   catch{}
   if($("bookTitle"))$("bookTitle").value=data.title||p.name||"";
   if(typeof load==="function")load();
   restoreEditorDraft();
   if(typeof renderTaskFields==="function"&&typeof currentTask!=="undefined")renderTaskFields(currentTask);
   if(typeof renderVersions==="function")renderVersions();
   if(typeof refreshContextPreview==="function")refreshContextPreview();
   renderMemory();renderTimeline();renderMaterials();renderProjects();
 }
 function activateProject(id){
   if(id===workspace.activeId)return;
   if(typeof editorSaveTimer!=="undefined"&&$("page-chapters")&&!$("page-chapters").classList.contains("hidden")){clearTimeout(editorSaveTimer);saveEditorDraft();}
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

 function renderRelationships(){
   const from=$("relationFrom"),to=$("relationTo"),graph=$("relationshipGraph"),list=$("relationshipList");if(!from||!to||!graph||!list)return;
   const names=data.characters.map(c=>c.name).filter(Boolean);
   [from,to].forEach(select=>{const previous=select.value;select.innerHTML="";names.forEach(name=>{const option=document.createElement("option");option.value=name;option.textContent=name;select.append(option);});if(names.includes(previous))select.value=previous;});
   from.disabled=to.disabled=names.length<2;graph.innerHTML="";list.innerHTML="";
   if(names.length<1){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="先到人物档案添加人物，再建立人物关系。";graph.append(empty);}
   else{
     const width=640,height=300,cx=width/2,cy=height/2,radius=Math.min(112,42+names.length*7);
     const points=names.map((name,i)=>({name,x:names.length===1?cx:cx+Math.cos(-Math.PI/2+i*2*Math.PI/names.length)*radius,y:names.length===1?cy:cy+Math.sin(-Math.PI/2+i*2*Math.PI/names.length)*radius}));
     const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 "+width+" "+height);svg.setAttribute("width","640");svg.setAttribute("height","300");svg.setAttribute("role","img");svg.setAttribute("aria-label","人物关系网络图");
     const pointMap=new Map(points.map(p=>[p.name,p]));
     data.relationships.forEach(rel=>{const a=pointMap.get(rel.from),b=pointMap.get(rel.to);if(!a||!b)return;const line=document.createElementNS(svg.namespaceURI,"line");line.setAttribute("x1",a.x);line.setAttribute("y1",a.y);line.setAttribute("x2",b.x);line.setAttribute("y2",b.y);line.setAttribute("class","relation-edge");svg.append(line);const label=document.createElementNS(svg.namespaceURI,"text");label.setAttribute("x",(a.x+b.x)/2);label.setAttribute("y",(a.y+b.y)/2-5);label.setAttribute("class","relation-edge-label");label.textContent=rel.type;svg.append(label);});
     points.forEach(point=>{const circle=document.createElementNS(svg.namespaceURI,"circle");circle.setAttribute("cx",point.x);circle.setAttribute("cy",point.y);circle.setAttribute("r","25");circle.setAttribute("class","relation-node");svg.append(circle);const label=document.createElementNS(svg.namespaceURI,"text");label.setAttribute("x",point.x);label.setAttribute("y",point.y+4);label.setAttribute("class","relation-node-label");label.textContent=point.name.length>6?point.name.slice(0,6)+"…":point.name;svg.append(label);});
     graph.append(svg);
   }
   data.relationships.forEach((rel,i)=>{const chip=document.createElement("span");chip.className="relationship-chip";chip.textContent=rel.from+" · "+rel.type+" · "+rel.to+(rel.note?"（"+rel.note+"）":"");const del=document.createElement("button");del.type="button";del.textContent="×";del.title="删除关系";del.style.marginLeft="6px";del.onclick=()=>{data.relationships.splice(i,1);persist();renderRelationships();};chip.append(del);list.append(chip);});
 }
 $("saveRelationship")?.addEventListener("click",()=>{
   const a=$("relationFrom").value,b=$("relationTo").value;if(!a||!b||a===b){alert("请选择两位不同的人物。");return;}
   const type=$("relationType").value,note=$("relationNote").value.trim();
   if(data.relationships.some(x=>x.from===a&&x.to===b&&x.type===type)){alert("这条人物关系已经存在。");return;}
   data.relationships.push({from:a,to:b,type,note});$("relationNote").value="";persist();renderRelationships();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });

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
 let editingTimeline=-1;
 function renderTimeline(){
   const box=$("timelineList");if(!box)return;box.innerHTML="";$("timelineCount").textContent=data.timelineEvents.length+" 个事件";
   if(!data.timelineEvents.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="还没有剧情事件。按故事发生顺序添加关键节点。";box.append(empty);return;}
   data.timelineEvents.forEach((item,i)=>box.append(recordCard(item,item.date+" · "+(item.updatedAt||""),[
    {label:"编辑",run:()=>{editingTimeline=i;$("eventDate").value=item.date;$("eventTitle").value=item.title;$("eventContent").value=item.content||"";$("saveTimelineEvent").textContent="更新事件";}},
    {label:"上移",run:()=>{if(i===0)return;[data.timelineEvents[i-1],data.timelineEvents[i]]=[data.timelineEvents[i],data.timelineEvents[i-1]];persist();renderTimeline();}},
    {label:"下移",run:()=>{if(i===data.timelineEvents.length-1)return;[data.timelineEvents[i+1],data.timelineEvents[i]]=[data.timelineEvents[i],data.timelineEvents[i+1]];persist();renderTimeline();}},
    {label:"删除",run:()=>{if(!confirm("确定删除该剧情事件？"))return;data.timelineEvents.splice(i,1);persist();renderTimeline();}}
   ])));
 }
 $("saveTimelineEvent")?.addEventListener("click",()=>{
   const date=$("eventDate").value.trim(),title=$("eventTitle").value.trim(),content=$("eventContent").value.trim();if(!date||!title){alert("请填写故事时间和事件名称。");return;}
   const event={date,title,content,updatedAt:new Date().toLocaleString()};if(editingTimeline<0)data.timelineEvents.push(event);else data.timelineEvents[editingTimeline]=event;editingTimeline=-1;
   $("eventDate").value="";$("eventTitle").value="";$("eventContent").value="";$("saveTimelineEvent").textContent="添加事件";persist();renderTimeline();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });
 let editingMaterial=-1;
 function renderMaterials(){
   const box=$("materialList");if(!box)return;box.innerHTML="";
   const q=($("materialSearch")?.value||"").trim().toLowerCase();
   const filtered=data.materials.map((x,i)=>({...x,_index:i})).filter(x=>!q||[x.title,x.category,x.content,(x.tags||[]).join(" ")].join(" ").toLowerCase().includes(q));
   $("materialCount").textContent=filtered.length+" / "+data.materials.length+" 条";
   if(!filtered.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent=q?"没有找到匹配素材。":"素材库还是空的，添加第一条灵感或参考资料吧。";box.append(empty);return;}
   filtered.forEach(item=>box.append(recordCard(item,item.category+" · "+(item.tags||[]).join("、"),[
    {label:"编辑",run:()=>{editingMaterial=item._index;$("materialCategory").value=item.category;$("materialTitle").value=item.title;$("materialContent").value=item.content;$("materialTags").value=(item.tags||[]).join("、");$("saveMaterial").textContent="更新素材";}},
    {label:"放入创作区",run:()=>{switchPage("studio");$("freeReference").value=item.content;$("freeInstruction").value="请参考这条素材进行创作："+item.title;}},
    {label:"删除",run:()=>{if(!confirm("确定删除这条素材？"))return;data.materials.splice(item._index,1);persist();renderMaterials();}}
   ])));
 }
 $("saveMaterial")?.addEventListener("click",()=>{
   const title=$("materialTitle").value.trim(),content=$("materialContent").value.trim();if(!title||!content){alert("请填写素材名称和内容。");return;}
   const item={category:$("materialCategory").value,title,content,tags:$("materialTags").value.split(/[,，、]/).map(x=>x.trim()).filter(Boolean),createdAt:new Date().toLocaleString()};if(editingMaterial<0)data.materials.push(item);else data.materials[editingMaterial]=item;editingMaterial=-1;
   $("materialTitle").value="";$("materialContent").value="";$("materialTags").value="";$("saveMaterial").textContent="保存素材";persist();renderMaterials();if(typeof refreshContextPreview==="function")refreshContextPreview();
 });
 $("materialSearch")?.addEventListener("input",renderMaterials);
 window.addEventListener("beforeunload",()=>{if(typeof editorSaveTimer!=="undefined"&&$("page-chapters")&&!$("page-chapters").classList.contains("hidden")){clearTimeout(editorSaveTimer);saveEditorDraft();}});
 $("bookTitle")?.addEventListener("input",()=>{data.title=$("bookTitle").value;const p=activeProject();if(p){p.name=data.title||"未命名作品";p.data=clone(data);try{localStorage.setItem("novelStudioV2",JSON.stringify(data));localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}catch{}}});

 function restoreEditorDraft(){
   const draft=activeProject().editorDraft;
   if(draft&&$("chapterTitle")&&$("chapterBody")){activeChapter=null;$("chapterTitle").value=draft.title||"";$("chapterBody").value=draft.body||"";updateChapterWordCount();if($("chapterSaveState"))$("chapterSaveState").textContent="已恢复未保存草稿";}
 }
 function updateChapterWordCount(){
   const text=$("chapterBody")?.value||"";
   const count=(text.match(/[\u3400-\u9fff]|[A-Za-z0-9]+/g)||[]).length;
   if($("chapterWordCount"))$("chapterWordCount").textContent=count.toLocaleString()+" 字";
 }
 function downloadText(filename,content){
   const blob=new Blob(["\uFEFF",content],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 let editorSaveTimer=null;
 function saveEditorDraft(){
   const p=activeProject();if(!p)return;
   const title=$("chapterTitle")?.value||"",body=$("chapterBody")?.value||"";
   if(activeChapter!==null&&data.chapters[activeChapter]){
     data.chapters[activeChapter]={...data.chapters[activeChapter],title:title||"未命名章节",body};
     persist();
     if($("chapterSaveState"))$("chapterSaveState").textContent="已自动保存 · "+new Date().toLocaleTimeString();
   }else{
     p.editorDraft={title,body,updatedAt:new Date().toISOString()};
     try{localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace));}catch{}
     if($("chapterSaveState"))$("chapterSaveState").textContent="草稿已自动保存 · "+new Date().toLocaleTimeString();
   }
 }
 function refreshChapterListControls(){
   const list=$("chapterList");if(!list)return;
   [...list.children].forEach((item,index)=>{
     if(item.querySelector(".chapter-list-actions"))return;
     const actions=document.createElement("div");actions.className="chapter-list-actions";
     [{label:"↑ 上移",delta:-1},{label:"↓ 下移",delta:1}].forEach(action=>{
       const button=document.createElement("button");button.type="button";button.textContent=action.label;button.disabled=index+action.delta<0||index+action.delta>=data.chapters.length;
       button.onclick=event=>{event.stopPropagation();const target=index+action.delta;[data.chapters[index],data.chapters[target]]=[data.chapters[target],data.chapters[index]];if(activeChapter===index)activeChapter=target;else if(activeChapter===target)activeChapter=index;persist();renderChapters();};
       actions.append(button);
     });
     item.append(actions);
   });
 }
 const originalRenderChapters=renderChapters;
 renderChapters=function(){originalRenderChapters();refreshChapterListControls();};
 $("chapterBody")?.addEventListener("input",()=>{
   updateChapterWordCount();clearTimeout(editorSaveTimer);editorSaveTimer=setTimeout(saveEditorDraft,650);
 });
 $("chapterTitle")?.addEventListener("input",()=>{
   clearTimeout(editorSaveTimer);editorSaveTimer=setTimeout(saveEditorDraft,650);
 });
 $("chapterList")?.addEventListener("click",event=>{
   if(event.target.closest("button"))return;
   setTimeout(()=>{const p=activeProject();if(p){delete p.editorDraft;saveWorkspace();}updateChapterWordCount();if($("chapterSaveState"))$("chapterSaveState").textContent="正在编辑已保存章节";},0);
 });
 $("newChapter")?.addEventListener("click",()=>{activeChapter=null;setTimeout(()=>{updateChapterWordCount();saveEditorDraft();},0);});
 $("saveChapterEdit")?.addEventListener("click",()=>{clearTimeout(editorSaveTimer);setTimeout(()=>{delete activeProject().editorDraft;saveWorkspace();if($("chapterSaveState"))$("chapterSaveState").textContent="章节已保存";updateChapterWordCount();},0);});
 $("focusEditor")?.addEventListener("click",()=>{
   const focused=document.body.classList.toggle("writing-focus");$("focusEditor").textContent=focused?"退出沉浸写作":"沉浸写作";
 });
 $("chapterFind")?.addEventListener("keydown",event=>{if(event.key==="Enter")$("replaceChapterText").click();});
 $("replaceChapterText")?.addEventListener("click",()=>{
   const find=$("chapterFind").value;if(!find){alert("请先填写要查找的文字。");return;}
   const body=$("chapterBody"),original=body.value,count=original.split(find).length-1;if(!count){alert("没有找到匹配文字。");return;}
   body.value=original.split(find).join($("chapterReplace").value);body.dispatchEvent(new Event("input",{bubbles:true}));alert("已替换 "+count+" 处。");
 });
 $("exportCurrentChapter")?.addEventListener("click",()=>{
   const title=$("chapterTitle").value.trim()||"未命名章节",body=$("chapterBody").value;if(!body.trim()){alert("当前章节没有正文。");return;}downloadText(title.replace(/[\\/:*?"<>|]/g,"_")+".txt",title+"\n\n"+body);
 });
 $("exportAllChapters")?.addEventListener("click",()=>{
   if(!data.chapters.length){alert("当前小说还没有已保存章节。");return;}
   const content=data.chapters.map((c,i)=>"第 "+(i+1)+" 章  "+(c.title||"未命名章节")+"\n\n"+(c.body||"")).join("\n\n"+"—".repeat(24)+"\n\n");
   downloadText((data.title||"小说")+"-全文.txt",(data.title||"小说")+"\n\n"+content);
 });
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&document.body.classList.contains("writing-focus")){document.body.classList.remove("writing-focus");if($("focusEditor"))$("focusEditor").textContent="沉浸写作";}});
 // AI-powered manuscript quality review. The report never edits manuscript data.
 $("runQualityCheck")?.addEventListener("click",async()=>{
   const selected=[...document.querySelectorAll(".quality-checks input:checked")].map(x=>x.value);
   if(!selected.length){alert("至少选择一个检测项目。");return;}
   const pasted=$("qaInput").value.trim();
   const manuscript=pasted||data.chapters.slice(-8).map(c=>"【"+c.title+"】\n"+(c.body||"").slice(0,4500)).join("\n\n");
   const source=manuscript||data.synopsis||"";
   if(!source.trim()){alert("当前项目还没有可审查的正文或故事简介。请先添加章节，或粘贴需要检测的内容。");return;}
   const btn=$("runQualityCheck"),status=$("qaStatus");btn.disabled=true;btn.textContent="AI 正在检测…";status.textContent="正在分析 "+selected.join("、")+"；不会修改原文。";
   const prompt="请对以下小说内容进行专业质量审查。重点检查："+selected.join("、")+"。\n请按以下结构输出：\n一、总体评价（简明）\n二、发现的问题（按严重/中等/建议分类，引用具体原句或情节位置）\n三、前后矛盾与证据\n四、修改建议（给出可直接执行的方案，必要时提供示例）\n五、优先修改清单。\n不要擅自重写原文，不要把推测当成事实；资料不足时标注“无法判断”。\n\n【待审查内容】\n"+source;
   try{const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task:"剧情审查",prompt,context:contextText()})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"检测请求失败");$("qaResult").value=payload.text||"";status.textContent="检测完成 · "+$("qaResult").value.length+" 字。请核对 AI 指出的证据，再决定是否修改。";}
   catch(error){status.textContent="检测失败："+error.message;}
   finally{btn.disabled=false;btn.textContent="✦ 开始 AI 质量检测";}
 });
 $("saveQualityReport")?.addEventListener("click",()=>{
   const content=$("qaResult").value.trim();if(!content){alert("还没有可保存的检测报告。");return;}
   data.archive.push({category:"小说质量检测",title:(data.title||"小说")+" · 质量检测报告",content,createdAt:new Date().toLocaleString()});persist();if(typeof renderArchive==="function")renderArchive();alert("检测报告已保存到创作归档。");
 });
 // Keep the project's data synchronized when existing app controls save it.
 const originalRenderCharacters=renderCharacters;
 renderCharacters=function(){originalRenderCharacters();renderRelationships();};
 const originalLoad=load;
 load=function(){originalLoad();renderMemory();renderTimeline();renderMaterials();renderProjects();renderRelationships();};
 // Ensure switching to the new modules always shows their current data.
 document.querySelectorAll('.nav button[data-page]').forEach(button=>button.addEventListener("click",()=>{
   if(button.dataset.page==="projects")renderProjects();
   if(button.dataset.page==="memory")renderMemory();
   if(button.dataset.page==="timeline")renderTimeline();
   if(button.dataset.page==="library")renderMaterials();
   if(button.dataset.page==="quality")$("qaInput")?.focus();
 }));
 // Initialise project workspace without replacing the legacy single-project key.
 saveWorkspace();
 if(typeof load==="function")load();
 restoreEditorDraft();
 if(typeof renderTaskFields==="function"&&typeof currentTask!=="undefined")renderTaskFields(currentTask);
 if(typeof renderVersions==="function")renderVersions();
 if(typeof refreshContextPreview==="function")refreshContextPreview();
 if($("bookTitle"))$("bookTitle").value=data.title||activeProject().name||"";
 renderMemory();renderTimeline();renderMaterials();renderProjects();renderRelationships();
})();
