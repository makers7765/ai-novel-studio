/* Defensive page navigation: keep exactly one workspace section active. */
(()=> {
  const nav=document.getElementById("nav");
  if(!nav)return;
  nav.addEventListener("click",event=>{
    const button=event.target.closest("button[data-page]");
    if(!button)return;
    const target=document.getElementById("page-"+button.dataset.page);
    if(!target)return;
    document.querySelectorAll("main section").forEach(section=>{
      section.classList.add("hidden");
      section.setAttribute("aria-hidden","true");
    });
    target.classList.remove("hidden");
    target.removeAttribute("aria-hidden");
    nav.querySelectorAll("button[data-page]").forEach(item=>{
      const active=item===button;
      item.classList.toggle("active",active);
      item.setAttribute("aria-current",active?"page":"false");
    });
    nav.classList.remove("mobile-open");
    const toggle=document.getElementById("mobileNavToggle");
    if(toggle){toggle.setAttribute("aria-expanded","false");toggle.textContent="☰ 打开导航菜单";}
  },true);
})();
