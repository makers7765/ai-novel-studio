
// Unified free-writing workspace: generation, selected-text editing and iterative revisions.
(()=>{
 const $id=id=>document.getElementById(id);
 const mode=$id("freeMode"), reference=$id("freeReference"), instruction=$id("freeInstruction");
 const hint=$id("freeModeHint"), status=$id("freeSelectionStatus"), run=$id("runFreeWrite");
 if(!mode||!reference||!instruction||!run)return;
 const hints={"自由创作":"从一个想法开始，AI 会结合当前小说资料补全合理细节。","扩写":"保留原文核心意思，扩展场景、动作、心理和细节。","续写":"承接参考文字最后的情节继续写，不重复前文。","重写":"按照新要求重组表达；除非明确要求，不改变剧情事实。","润色":"优化语言、节奏和画面感，尽量保留原文风格。","缩写":"压缩冗余表达，保留关键情节、信息和情绪。","自定义":"直接描述你想让 AI 完成的任务。"};
 mode.addEventListener("change",()=>{hint.textContent=hints[mode.value]||hints["自定义"];});
 $id("useSelectedText").addEventListener("click",()=>{
   const sel=window.getSelection();const selected=String(sel||"").trim();const result=$id("result");
   if(!selected||!result.contains(sel.anchorNode)){status.textContent="请先在下方 AI 生成结果中选中一段文字，再点击此按钮。";return;}
   reference.value=selected;mode.value="重写";hint.textContent=hints["重写"];status.textContent="已载入 "+selected.length+" 字选段；输入修改要求后即可让 AI 处理。";instruction.focus();
 });
 run.addEventListener("click",async()=>{
   const chosenMode=mode.value;const ref=reference.value.trim();const ask=instruction.value.trim();
   const current=($id("result").innerText||$id("result").textContent||"").trim();
   const needsSource=["扩写","续写","重写","润色","缩写"].includes(chosenMode);
   const source=ref||(needsSource?current:"");
   if(needsSource&&!source){status.textContent="这个模式需要参考文字：请粘贴原文，或先在结果区选中一段文字。";reference.focus();return;}
   if(!ask&&!source&&chosenMode!=="自由创作"){status.textContent="请简单描述你希望 AI 完成什么；其他资料都可以留空。";instruction.focus();return;}
   const task=["重写","润色","缩写"].includes(chosenMode)?"选段修改":"自由创作";
   const behavior={"自由创作":"根据用户要求创作新的小说内容。若信息不足，结合小说资料进行合理补全；不要追问非必要信息。","扩写":"扩写参考文字，保留原有事实和剧情走向，增加具体场景、动作、感官、心理和对话。","续写":"从参考文字结尾自然续写，不重复前文，保持人物、视角、设定和因果一致。","重写":"按用户要求重写参考文字；保留明确指定的人物、事实和剧情约束。","润色":"润色参考文字，改善表达、节奏、画面感和可读性，不擅自改变剧情。","缩写":"精简参考文字，保留关键事件、人物关系、信息和情绪。","自定义":"严格按用户的自定义要求处理参考文字或创作新内容。"};
   const prompt="【创作模式】"+chosenMode+"\n【执行要求】"+(behavior[chosenMode]||behavior["自定义"])+"\n【参考文字】\n"+(source||"无；请根据用户要求和小说资料创作。")+"\n\n【用户指令】\n"+(ask||"请根据参考资料创作合适的小说内容。")+"\n\n只输出可直接使用的创作内容，不要解释执行过程。";
   const oldLabel=run.textContent;run.disabled=true;run.textContent="AI 正在创作…";status.textContent="正在处理本次要求；原结果会保留在版本历史中。";
   try{
     const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,prompt,context:typeof contextText==="function"?contextText():""})});
     const payload=await response.json();if(!response.ok)throw new Error(payload.error||"AI 请求失败");
     const output=String(payload.text||"").trim();if(!output)throw new Error("AI 没有返回正文");
     const result=$id("result");result.textContent=output;
     const saveTask=chosenMode==="续写"?"续写":(["重写","润色","缩写"].includes(chosenMode)?"润色改写":"章节创作");
     if(typeof currentTask!=="undefined"){
       currentTask=saveTask;
       if($id("taskName"))$id("taskName").value=saveTask;
       if(typeof taskJobs!=="undefined")taskJobs[saveTask]={status:"done",result:output,seq:Date.now()};
     }
     if(typeof saveResultVersion==="function")saveResultVersion(output,"自由创作·"+chosenMode);
     if(typeof syncEditedResult==="function")syncEditedResult();
     if(typeof renderVersions==="function")renderVersions();
     const p=$id("progress");if(p){p.textContent="已完成："+chosenMode+"。你可以直接编辑结果、继续提出修改要求，或保存到章节 / 对应资料库。";p.dataset.state="success";}
     status.textContent="创作完成 · "+output.length+" 字。可继续修改，下一次会以当前结果为基础。";
   }catch(error){status.textContent="生成失败："+error.message;}
   finally{run.disabled=false;run.textContent=oldLabel;}
 });
})();
