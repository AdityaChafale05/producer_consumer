const menuItems = [
  {id:1,name:"Vada Pav",price:35,category:"Snacks",emoji:"🍔",desc:"Mumbai's iconic potato patty"},
  {id:2,name:"Samosa (2 pcs)",price:40,category:"Snacks",emoji:"🥟",desc:"Crispy, spiced potato filling"},
  {id:3,name:"Veg Pakora",price:60,category:"Snacks",emoji:"🧆",desc:"Crunchy fritters with chutney"},
  {id:4,name:"Poha",price:35,category:"Meals",emoji:"🥣",desc:"Light Maharashtrian breakfast"},
  {id:5,name:"Pav Bhaji",price:90,category:"Meals",emoji:"🍛",desc:"Buttery pav with bhaji"},
  {id:6,name:"Masala Maggi",price:50,category:"Meals",emoji:"🍜",desc:"Instant noodles, café style"},
  {id:7,name:"Masala Chai",price:20,category:"Drinks",emoji:"🫖",desc:"Ginger-spiced Indian tea"},
  {id:8,name:"Cold Coffee",price:80,category:"Drinks",emoji:"🥤",desc:"Chilled, creamy coffee"},
  {id:9,name:"Nimbu Pani",price:25,category:"Drinks",emoji:"🍋",desc:"Fresh lemon cooler"},
  {id:10,name:"Gulab Jamun",price:45,category:"Sweets",emoji:"🍮",desc:"Two soft syrup-soaked bites"},
  {id:11,name:"Veg Sandwich",price:60,category:"Snacks",emoji:"🥪",desc:"Toasted with fresh vegetables"},
  {id:12,name:"French Fries",price:70,category:"Snacks",emoji:"🍟",desc:"Golden and lightly salted"}
];
const CAPACITY=3;
let cart={}; let queue=[]; let nextOrder=1001; let activeCategory="All"; let lockBusy=false;
const $=id=>document.getElementById(id);
const money=n=>"₹"+n.toFixed(2).replace(/\.00$/,"");
function log(message,type=""){
  const el=document.createElement("div"); el.className="log-entry "+type;
  const time=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  el.innerHTML=`<time>${time}</time>${message}`;
  $("eventLog").prepend(el);
}
function renderMenu(){
  const term=$("search").value.toLowerCase();
  const items=menuItems.filter(x=>(activeCategory==="All"||x.category===activeCategory)&&(x.name.toLowerCase().includes(term)||x.desc.toLowerCase().includes(term)));
  $("menu").innerHTML=items.map(x=>`<article class="food-card"><div class="food-art">${x.emoji}</div><div class="food-info"><div class="food-name">${x.name}</div><div class="food-desc">${x.desc}</div><div class="food-bottom"><span class="price">${money(x.price)}</span><button class="add-btn" data-add="${x.id}">＋ Add</button></div></div></article>`).join("")||'<div class="empty-state">No menu items found.</div>';
  document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{const item=menuItems.find(x=>x.id===+b.dataset.add);cart[item.id]=(cart[item.id]||0)+1;renderCart();log(`<strong>Tablet:</strong> added ${item.name} to the local cart.`)}));
}
function renderCart(){
  const entries=Object.entries(cart).filter(([,q])=>q>0);
  $("cartCount").textContent=entries.reduce((s,[,q])=>s+q,0);
  $("cartItems").innerHTML=entries.length?entries.map(([id,q])=>{const x=menuItems.find(a=>a.id===+id);return `<div class="cart-row"><div class="cart-emoji">${x.emoji}</div><div class="cart-name">${x.name}<small>${money(x.price)} each</small></div><div class="qty"><button data-minus="${id}">−</button><span>${q}</span><button data-plus="${id}">+</button></div></div>`}).join(""):'<div class="empty-state">Your cart is waiting for its first snack.</div>';
  $("cartItems").querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const id=b.dataset.minus;cart[id]--;if(cart[id]<=0)delete cart[id];renderCart()});
  $("cartItems").querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{const id=b.dataset.plus;cart[id]++;renderCart()});
  const subtotal=entries.reduce((s,[id,q])=>s+menuItems.find(x=>x.id===+id).price*q,0),tax=subtotal*.05;
  $("subtotal").textContent=money(subtotal);$("tax").textContent=money(tax);$("total").textContent=money(subtotal+tax);
  $("placeOrder").disabled=!entries.length||queue.length>=CAPACITY;
  $("placeHint").textContent=queue.length>=CAPACITY?"Buffer full: kitchen must consume an order before another can be placed.":"Orders enter a bounded queue with capacity 3.";
}
function renderQueue(){
  $("queueStatus").textContent=`${queue.length} / ${CAPACITY} slots`;
  $("bufferSlots").innerHTML=Array.from({length:CAPACITY},(_,i)=>{const o=queue[i];return o?`<div class="slot filled"><strong>#${o.id}</strong><small>${o.summary}</small><small>${money(o.total)}</small></div>`:`<div class="slot"><strong>Slot ${i+1}</strong><small>Empty</small></div>`}).join("");
  $("processOrder").disabled=!queue.length;
  renderCart();
}
function withMutex(operation,callback){
  if(lockBusy){log(`<strong>Mutex:</strong> lock is busy; operation waits for its critical section.`,"warn");return false}
  lockBusy=true; log(`<strong>Mutex acquired:</strong> entering critical section for ${operation}.`);
  try{callback()}finally{lockBusy=false;log(`<strong>Mutex released:</strong> shared queue is available again.`)}
  return true;
}
function placeOrder(){
  const entries=Object.entries(cart).filter(([,q])=>q>0);
  if(!entries.length)return;
  if(queue.length>=CAPACITY){log("<strong>empty semaphore = 0:</strong> buffer full. Producer blocked; no order was added.","warn");return}
  // Semaphore analogue: acquire one empty slot before entering critical section.
  log(`<strong>empty.acquire():</strong> ${CAPACITY-queue.length} free slot(s) before this order.`);
  withMutex("producer enqueue",()=>{
    const lines=entries.map(([id,q])=>{const x=menuItems.find(a=>a.id===+id);return {...x,qty:q}});
    const subtotal=lines.reduce((s,x)=>s+x.price*x.qty,0),total=subtotal*1.05;
    const order={id:nextOrder++,lines,summary:lines.map(x=>`${x.qty}× ${x.name}`).join(", "),total,created:Date.now()};
    queue.push(order);cart={};
    log(`<strong>Producer:</strong> order #${order.id} inserted into shared buffer.`);
    log(`<strong>full.release():</strong> not-empty signal sent. Kitchen can consume order #${order.id}.`);
  });
  renderQueue();
}
function processOrder(){
  if(!queue.length){log("<strong>full semaphore = 0:</strong> buffer empty. Consumer waits; there is no order to prepare.","warn");return}
  withMutex("consumer dequeue",()=>{
    const o=queue.shift();
    log(`<strong>Consumer:</strong> kitchen started order #${o.id} — ${o.summary}.`);
    log(`<strong>empty.release():</strong> one buffer slot freed; producer may enqueue again.`);
  });
  renderQueue();
}
function raceDemo(){
  if(queue.length===0){
    // Seed an order for the demonstration, without changing the cart.
    const o={id:nextOrder++,lines:[],summary:"Demo Samosa",total:40,created:Date.now()};
    queue.push(o);renderQueue();log(`<strong>Demo setup:</strong> inserted #${o.id} so unsafe workers have a shared item.`);
  }
  const workers=+$("workers").value;const first=queue[0];
  // Intentionally model both workers reading before either performs the removal.
  const reads=Array.from({length:workers},(_,i)=>`Worker ${i+1} reads queue[0] = order #${first.id}`);
  $("raceResult").innerHTML=`<b>Race reproduced:</b><br>${reads.join("<br>")}<br><br>All ${workers} workers believe they own the same order. If they perform work before a protected dequeue, the order can be prepared ${workers} times.`;
  log(`<strong>Unsafe race:</strong> ${workers} workers read order #${first.id} before any worker removes it. Duplicate work is possible.`,"error");
  log(`<strong>With mutex:</strong> workers must acquire the lock; first worker removes #${first.id}, later workers see the next item or an empty queue.`);
}
$("search").addEventListener("input",renderMenu);
$("filters").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.category;$("filters").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));renderMenu()}));
$("placeOrder").addEventListener("click",placeOrder);
$("processOrder").addEventListener("click",processOrder);
$("clearCart").addEventListener("click",()=>{cart={};renderCart();log("<strong>Tablet:</strong> cart cleared.")});
$("resetLab").addEventListener("click",()=>{cart={};queue=[];nextOrder=1001;$("raceResult").textContent="Run the demo to compare unsafe access with the mutex-protected queue.";$("eventLog").innerHTML="";renderCart();renderQueue();log("<strong>Lab reset:</strong> queue, cart, and order counter reset.")});
$("raceDemo").addEventListener("click",raceDemo);
$("clearLog").addEventListener("click",()=>$("eventLog").innerHTML="");
renderMenu();renderCart();renderQueue();
log("<strong>Lab ready:</strong> empty = 3, full = 0. Producer can add; consumer waits until an order exists.");
