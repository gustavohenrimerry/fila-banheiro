const socket = io();

const nomeInput = document.getElementById("nome");
const statusDiv = document.getElementById("status");
const popupDiv = document.getElementById("popup");

const audio = new Audio(
  "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
);

if(localStorage.getItem("nome")){
  nomeInput.value = localStorage.getItem("nome");
}

function entrarFila(){

  const nome = nomeInput.value.trim();

  if(!nome){

    alert("Digite seu nome");

    return;

  }

  localStorage.setItem("nome", nome);

  socket.emit("entrarFila", nome);

}

function sairFila(){

  const nome = nomeInput.value;

  socket.emit("sairFila", nome);

  popupDiv.innerHTML = "";

}

socket.on("erroNome",(mensagem)=>{

  alert(mensagem);

});

socket.on("filaAtualizada", (fila)=>{

  const nome = nomeInput.value;

  const aluno = fila.find(a =>
    a.nome.toLowerCase().startsWith(nome.toLowerCase())
  );

  const posicao = fila.findIndex(a =>
    a.nome === aluno?.nome
  );

  if(posicao !== -1){

    statusDiv.innerHTML = `

      <h3>Você está na fila</h3>

      <div class="status-info">

        <div class="card-status">

          <small>Posição</small>

          <div class="numero">
            ${posicao + 1}
          </div>

        </div>

        <div class="card-status">

          <small>Na frente</small>

          <div class="numero">
            ${posicao}
          </div>

        </div>

      </div>

    `;

  }else{

    statusDiv.innerHTML = `
      Você não está na fila
    `;

    popupDiv.innerHTML = "";

  }

});

socket.on("vezAluno",(nome)=>{

  const meuNome = nomeInput.value;

  if(nome.toLowerCase().startsWith(meuNome.toLowerCase())){

    audio.play();

    popupDiv.innerHTML = `

      <div class="popup">

        <h2>É SUA VEZ</h2>

        <p>Pode ir ao banheiro</p>

      </div>

    `;

  }

});

socket.on("mostrarPopup",(nome)=>{

  const meuNome = nomeInput.value;

  if(nome.toLowerCase().startsWith(meuNome.toLowerCase())){

    popupDiv.innerHTML = `

      <div class="popup">

        <h2>É SUA VEZ</h2>

        <p>Pode ir ao banheiro</p>

      </div>

    `;

  }

});