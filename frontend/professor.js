const socket = io(
  "https://fila-banheiro-vst4.onrender.com",
  { transports: ["polling"] }
);

const alunos = [
  "Ana Beatriz Dos Santos Nascimento",
  "Ana Luisa Tosi Baldino",
  "Bruna Geovana Amaral Muniz",
  "Fernanda Oliveira Santos",
  "Gabrielle Da Costa Silva",
  "Geovanna Felix Alves De Lima",
  "Guilherme Nery Bernardino Da Luz",
  "Gustavo Henrique Rodrigues Souza",
  "Heliene Aquino Souza Barbosa",
  "Isabelly Da Silva Nascimento",
  "Jadilson Inacio Dos Santos",
  "Jennifer Nascimento Santos",
  "Joao Pedro Costa De Souza",
  "Julia Kathelen Barbosa Batista Dos Santos",
  "Julyanna Silva Do Nascimento",
  "Keisy Rodrigues Do Nascimento",
  "Leonardo De Deus Malinoski",
  "Leticia Vitoria Barros Da Silva",
  "Marcos Alexandre Da Silva Prado",
  "Maria Eduarda De Oliveira Ribeiro",
  "Moises Ferreira Soares",
  "Pedro Henrique Reis Silva",
  "Rebeca Keyzi Rodrigues Oliveira",
  "Renan Da Silva Santos",
  "Thiago Da Silva Araujo",
  "Thiago Salomão Martins",
  "Vinicius Inacio Portela Da Silva",
  "Yuri Vieira Nogueira"
];

let timerInterval = null;
let cooldownsGlobais = {};
let primeiroAtual = "";

/* =========================
   LOGIN
========================= */
function login() {
  const usuario = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  const usuariosValidos = [
    { usuario: "heitor", senha: "sala10tec" },
    { usuario: "fernanda", senha: "sala10port" }
  ];

  const valido = usuariosValidos.some(
    u => u.usuario === usuario && u.senha === senha
  );

  if (valido) {
    document.getElementById("login").style.display = "none";
    document.getElementById("painel").style.display = "block";
  } else {
    alert("Login inválido");
  }
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
socket.on("filaAtualizada", (fila) => {
  const contador = document.getElementById("contador");
  const primeiro = document.getElementById("primeiro");
  const filaDiv = document.getElementById("fila");

  contador.innerHTML = `${fila.length} alunos`;
  filaDiv.innerHTML = "";

  if (fila.length <= 0) {
    clearInterval(timerInterval);
    primeiro.innerHTML = `
      <div class="primeiroAluno">
        <h2>Fila vazia</h2>
      </div>
    `;
    primeiroAtual = "";
    return;
  }

  const alunoAtual = fila[0];

  // TIMER reinicia apenas quando aluno mudou ou voltou
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
      const timer = document.getElementById("timer");
      if (timer) timer.innerHTML = `${min}:${sec}`;
    }

    atualizarTimer();
    timerInterval = setInterval(atualizarTimer, 1000);
  }

  primeiro.innerHTML = `
    <div class="primeiroAluno">
      <h2>PRÓXIMO ALUNO</h2>
      <h1>${alunoAtual.nome}</h1>
      <div id="timer"></div>
    </div>
  `;

  // RESTO DA FILA
  fila.slice(1).forEach((aluno, index) => {
    filaDiv.innerHTML += `
      <div class="aluno">
        <span>${aluno.nome}</span>
        <div style="display:flex;gap:8px;align-items:center;">
          <button onclick="moverCima('${aluno.nome}')" style="background:#22c55e;border:none;color:white;border-radius:8px;padding:6px 10px;cursor:pointer;">↑</button>
          <button onclick="moverBaixo('${aluno.nome}')" style="background:#ef4444;border:none;color:white;border-radius:8px;padding:6px 10px;cursor:pointer;">↓</button>
          <div class="posicao">${index + 2} lugar, foi no banheiro ${aluno.contador || 0} vezes</div>
        </div>
      </div>
    `;
  });
});

/* =========================
   BOTÕES
========================= */
function proximoAluno() {
  socket.emit("proximoAluno");
}

function alunoVoltou() {
  socket.emit("alunoVoltou");
}

function moverCima(nome) {
  socket.emit("moverCima", nome);
}

function moverBaixo(nome) {
  socket.emit("moverBaixo", nome);
}

/* =========================
   LISTA DE ALUNOS
========================= */
const listaAlunos = document.getElementById("listaAlunos");

function renderizarListaAlunos() {
  listaAlunos.innerHTML = "";
  alunos.forEach((aluno) => {
    listaAlunos.innerHTML += `
      <div class="aluno" style="padding:10px;margin-bottom:8px;">
        <span style="font-size:13px;width:80%;">${aluno}</span>
        <button onclick="adicionarAluno('${aluno}')" style="width:35px;height:35px;border:none;border-radius:50%;background:#5b3df5;color:white;font-size:24px;cursor:pointer;">+</button>
      </div>
    `;
  });
}

renderizarListaAlunos();

function adicionarAluno(nome) {
  socket.emit("entrarFila", nome);
}

/* =========================
   CONTADOR
========================= */
socket.on("contadorAtualizado", (contador) => {
  const div = document.getElementById("contadorBanheiro");
  div.innerHTML = "";
  alunos.forEach((aluno) => {
    div.innerHTML += `
      <div class="aluno">
        <span style="font-size:14px;">${aluno}</span>
        <div class="posicao">${contador[aluno] || 0}</div>
      </div>
    `;
  });
});

/* =========================
   COOLDOWNS
========================= */
socket.on("cooldownsAtualizados", (cooldowns) => {
  cooldownsGlobais = cooldowns;
});

setInterval(() => {
  const div = document.getElementById("cooldowns");
  if (!div) return;
  div.innerHTML = "";
  const agora = Date.now();
  Object.keys(cooldownsGlobais).forEach((nome) => {
    const tempo = cooldownsGlobais[nome] - agora;
    if (tempo > 0) {
      const min = String(Math.floor(tempo / 60000)).padStart(2, "0");
      const sec = String(Math.floor((tempo % 60000) / 1000)).padStart(2, "0");
      div.innerHTML += `
        <div class="cooldownAluno">
          <span>${nome}</span>
          <span>${min}:${sec}</span>
        </div>
      `;
    }
  });
}, 1000);