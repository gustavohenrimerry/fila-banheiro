const socket = io("https://exciting-appreciation-fila-banheiro.up.railway.app/");

const nomeInput = document.getElementById("nome");
const statusDiv = document.getElementById("status");
const popupDiv = document.getElementById("popup");

const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

if(localStorage.getItem("nome")){
  nomeInput.value = localStorage.getItem("nome");
}

// Normaliza nomes: minusculo e sem acentos
function norm(str){
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

// Entrar na fila
function entrarFila(){
  const nome = nomeInput.value.trim();
  if(!nome){
    alert("Digite seu nome");
    return;
  }
  localStorage.setItem("nome", nome);
  socket.emit("entrarFila", nome);
}

// Sair da fila
function sairFila(){
  const nome = nomeInput.value.trim();
  if(!nome){
    alert("Digite seu nome");
    return;
  }
  socket.emit("sairFila", nome);
  statusDiv.innerHTML = "Você saiu da fila";
  popupDiv.innerHTML = "";
}

// Erros
socket.on("erroNome", (mensagem) => {
  alert(mensagem);
});

// Atualiza fila
socket.on("filaAtualizada", (fila) => {
  const nome = nomeInput.value.trim();
  const aluno = fila.find(a => norm(a.nome).startsWith(norm(nome)));
  const posicao = fila.findIndex(a => a.nome === aluno?.nome);

  if(posicao !== -1){
    statusDiv.innerHTML = `
      <h3>Você está na fila</h3>
      <div class="status-info">
        <div class="card-status">
          <small>Posição</small>
          <div class="numero">${posicao + 1}</div>
        </div>
        <div class="card-status">
          <small>Na frente</small>
          <div class="numero">${posicao}</div>
        </div>
      </div>
    `;
  }else{
    statusDiv.innerHTML = "Você não está na fila";
    popupDiv.innerHTML = "";
  }
});

// Popup "É sua vez"
socket.on("vezAluno", mostrarPopup);
socket.on("mostrarPopup", mostrarPopup);

function mostrarPopup(nomeAluno){
  const meuNome = nomeInput.value.trim();
  if(norm(nomeAluno).startsWith(norm(meuNome))){
    audio.play();
    popupDiv.innerHTML = `
      <div class="popup">
        <h2>É SUA VEZ</h2>
        <p>Pode ir ao banheiro</p>
      </div>
    `;
  }
}

// Entrar na fila com Enter
nomeInput.addEventListener("keydown", (event) => {
  if(event.key === "Enter"){
    entrarFila();
  }
});