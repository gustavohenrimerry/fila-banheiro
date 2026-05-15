const socket = io("https://fila-banheiro-vst4.onrender.com", { transports: ["polling"] });

let timerInterval = null;
let primeiroAtual = "";
let cooldownsGlobais = {};
let usuarioLogado = "";
let alunos = []; // lista de alunos do Supabase

/* =========================
   LOGIN / LOGOUT
========================= */
function login() {
  const usuario = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  if ((usuario === "heitor" && senha === "sala10tec") || (usuario === "fernanda" && senha === "sala10port")) {
    usuarioLogado = usuario;
    document.getElementById("usuarioLogado").innerText = "Logado como: " + usuarioLogado;
    document.getElementById("logoutContainer").style.display = "flex";
    document.getElementById("login").style.display = "none";
    document.getElementById("painel").style.display = "block";
  } else {
    alert("Login inválido");
  }
}

function logout() {
  usuarioLogado = "";
  document.getElementById("login").style.display = "block";
  document.getElementById("painel").style.display = "none";
  document.getElementById("logoutContainer").style.display = "none";
}

/* =========================
   MENUS
========================= */
function abrirLista() {
  const menu = document.getElementById("menuAlunos");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}
function fecharLista() {
  document.getElementById("menuAlunos").style.display = "none";
}
function abrirCooldowns() {
  const menu = document.getElementById("cooldownLista");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

/* =========================
   FILA
========================= */
socket.on("filaAtualizada", fila => {
  const contadorDiv = document.getElementById("contador");
  const primeiroDiv = document.getElementById("primeiro");
  const filaDiv = document.getElementById("fila");

  contadorDiv.innerHTML = `${fila.length} alunos`;
  filaDiv.innerHTML = "";

  if (fila.length === 0) {
    clearInterval(timerInterval);
    primeiroDiv.innerHTML = `<div class="primeiroAluno"><h2>Fila vazia</h2></div>`;
    primeiroAtual = "";
    return;
  }

  const alunoAtual = fila[0];

  // Timer do primeiro aluno
  if (primeiroAtual !== alunoAtual.nome) {
    primeiroAtual = alunoAtual.nome;
    clearInterval(timerInterval);
    if (!alunoAtual.inicio) alunoAtual.inicio = Date.now();

    function atualizarTimer() {
      const agora = Date.now();
      const diff = agora - alunoAtual.inicio;
      const total = Math.floor(diff / 1000);
      const min = String(Math.floor(total / 60)).padStart(2, "0");
      const sec = String(total % 60).padStart(2, "0");
      const timerElem = document.getElementById("timer");
      if (timerElem) timerElem.innerHTML = `${min}:${sec}`;
    }
    atualizarTimer();
    timerInterval = setInterval(atualizarTimer, 1000);
  }

  primeiroDiv.innerHTML = `<div class="primeiroAluno"><h2>PRÓXIMO ALUNO</h2><h1>${alunoAtual.nome}</h1><div id="timer"></div></div>`;

  // Lista de alunos na fila (com botões de mover)
  fila.slice(1).forEach((aluno, index) => {
    filaDiv.innerHTML += `
      <div class="aluno">
        <span>${aluno.nome}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button onclick="moverCima('${aluno.nome}')" style="background:#22c55e;border:none;color:white;border-radius:8px;padding:6px 10px;cursor:pointer;">↑</button>
          <button onclick="moverBaixo('${aluno.nome}')" style="background:#ef4444;border:none;color:white;border-radius:8px;padding:6px 10px;cursor:pointer;">↓</button>
          <div class="posicao">${index + 2}º lugar</div>
        </div>
      </div>
    `;
  });
});

/* =========================
   BOTÕES DA FILA
========================= */
function proximoAluno() { socket.emit("proximoAluno"); }
function alunoVoltou() { socket.emit("alunoVoltou"); }
function moverCima(nome) { socket.emit("moverCima", nome); }
function moverBaixo(nome) { socket.emit("moverBaixo", nome); }
function adicionarAluno(nome) { socket.emit("entrarFila", nome); }

/* =========================
   LISTA DE ALUNOS + CONTADOR
========================= */
const listaAlunosDiv = document.getElementById("listaAlunos");

socket.on("alunosAtualizados", alunosDB => {
  alunos = alunosDB;
  renderizarListaAlunos();
});

socket.on("contadorAtualizado", contador => {
  renderizarListaAlunos(contador);
});

function renderizarListaAlunos(contador = {}) {
  listaAlunosDiv.innerHTML = "";
  alunos.forEach(aluno => {
    const vezes = contador[aluno] || 0;
    listaAlunosDiv.innerHTML += `
      <div class="aluno" style="padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;">${aluno} - foi ${vezes} vezes</span>
        <button onclick="adicionarAluno('${aluno}')" style="width:35px;height:35px;border:none;border-radius:50%;background:#5b3df5;color:white;font-size:24px;cursor:pointer;">+</button>
      </div>
    `;
  });
}

/* =========================
   COOLDOWNS
========================= */
socket.on("cooldownsAtualizados", cooldowns => { cooldownsGlobais = cooldowns; });

setInterval(() => {
  const div = document.getElementById("cooldowns");
  if (!div) return;
  div.innerHTML = "";
  const agora = Date.now();
  Object.keys(cooldownsGlobais).forEach(nome => {
    const tempo = cooldownsGlobais[nome] - agora;
    if (tempo > 0) {
      const min = String(Math.floor(tempo / 60000)).padStart(2, "0");
      const sec = String(Math.floor((tempo % 60000) / 1000)).padStart(2, "0");
      div.innerHTML += `<div class="cooldownAluno"><span>${nome}</span><span>${min}:${sec}</span></div>`;
    }
  });
}, 1000);