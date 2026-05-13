const socket = io(
  "https://fila-banheiro-production.up.railway.app"
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

// LOGIN

function login(){

  const usuario =
    document.getElementById("usuario").value;

  const senha =
    document.getElementById("senha").value;

  if(
    usuario === "heitor"
    &&
    senha === "sala10tec"
  ){

    document.getElementById("login")
      .style.display = "none";

    document.getElementById("painel")
      .style.display = "block";

  }else{

    alert("Login inválido");

  }

}

// MENU ALUNOS

function abrirLista(){

  const menu =
    document.getElementById("menuAlunos");

  if(
    menu.style.display === "none"
    ||
    menu.style.display === ""
  ){

    menu.style.display = "block";

  }else{

    menu.style.display = "none";

  }

}
function fecharLista(){

  document.getElementById(
    "menuAlunos"
  ).style.display = "none";

}

// MENU COOLDOWN

function abrirCooldowns(){

  const menu =
    document.getElementById(
      "cooldownLista"
    );

  if(
    menu.style.display === "none"
    ||
    menu.style.display === ""
  ){

    menu.style.display = "block";

  }else{

    menu.style.display = "none";

  }

}

// FILA

socket.on("filaAtualizada", (fila)=>{

  const contador =
    document.getElementById("contador");

  contador.innerHTML =
    `${fila.length} alunos`;

  const primeiro =
    document.getElementById("primeiro");

  const filaDiv =
    document.getElementById("fila");

  filaDiv.innerHTML = "";

  clearInterval(timerInterval);

  // FILA VAZIA

  if(fila.length <= 0){

    primeiro.innerHTML = `

      <div class="primeiroAluno">

        <h2>Fila vazia</h2>

      </div>

    `;

    return;

  }

  // PRIMEIRO ALUNO

  primeiro.innerHTML = `

    <div class="primeiroAluno">

      <h2>PRÓXIMO ALUNO</h2>

      <h1>${fila[0].nome}</h1>

      <div id="timer">
        00:00
      </div>

    </div>

  `;

  // TIMER

  if(fila[0].inicioBanheiro){

    const inicio =
      Number(fila[0].inicioBanheiro);

    function atualizarTimer(){

      const agora =
        Date.now();

      const diferenca =
        agora - inicio;

      const totalSegundos =
        Math.floor(
          diferenca / 1000
        );

      const minutos =
        String(
          Math.floor(
            totalSegundos / 60
          )
        ).padStart(2,"0");

      const segundos =
        String(
          totalSegundos % 60
        ).padStart(2,"0");

      const timer =
        document.getElementById("timer");

      if(timer){

        timer.innerHTML =
          `${minutos}:${segundos}`;

      }

    }

    atualizarTimer();

    timerInterval =
      setInterval(
        atualizarTimer,
        1000
      );

  }

  // RESTANTE FILA

  fila.slice(1).forEach((aluno,index)=>{

    filaDiv.innerHTML += `

      <div class="aluno">

        <span>${aluno.nome}</span>

        <div class="posicao">
          ${index + 2}
        </div>

      </div>

    `;

  });

});

// BOTÕES

function proximoAluno(){

  socket.emit("proximoAluno");

}

function alunoVoltou(){

  socket.emit("alunoVoltou");

}

// LISTA ALUNOS

const listaAlunos =
  document.getElementById(
    "listaAlunos"
  );

function renderizarListaAlunos(){

  listaAlunos.innerHTML = "";

  alunos.forEach((aluno)=>{

    listaAlunos.innerHTML += `

      <div
        class="aluno"
        style="
          padding:10px;
          margin-bottom:8px;
        "
      >

        <span
          style="
            font-size:13px;
            width:80%;
          "
        >
          ${aluno}
        </span>

        <button
          onclick="adicionarAluno('${aluno}')"
          style="
            width:35px;
            height:35px;
            min-width:35px;
            display:flex;
            align-items:center;
            justify-content:center;
            border:none;
            border-radius:50%;
            background:#5b3df5;
            color:white;
            font-size:24px;
            cursor:pointer;
            font-weight:bold;
            padding:0;
          "
        >
          +
        </button>

      </div>

    `;

  });

}

renderizarListaAlunos();

function adicionarAluno(nome){

  socket.emit(
    "entrarFila",
    nome
  );

}

// CONTADOR

socket.on(
  "contadorAtualizado",
  (contador)=>{

    const div =
      document.getElementById(
        "contadorBanheiro"
      );

    div.innerHTML = "";

    alunos.forEach((aluno)=>{

      div.innerHTML += `

        <div class="aluno">

          <span style="font-size:14px;">
            ${aluno}
          </span>

          <div class="posicao">
            ${contador[aluno] || 0}
          </div>

        </div>

      `;

    });

});

// RECEBER COOLDOWNS

socket.on(
  "cooldownsAtualizados",
  (cooldowns)=>{

    cooldownsGlobais =
      cooldowns;

  }
);

// TIMER GLOBAL COOLDOWN

setInterval(()=>{

  const div =
    document.getElementById(
      "cooldowns"
    );

  if(!div) return;

  div.innerHTML = "";

  const agora =
    Date.now();

  Object.keys(cooldownsGlobais)
  .forEach((nome)=>{

    const tempo =
      cooldownsGlobais[nome]
      - agora;

    if(tempo > 0){

      const minutos =
        String(
          Math.floor(
            tempo / 60000
          )
        ).padStart(2,"0");

      const segundos =
        String(
          Math.floor(
            (tempo % 60000)
            / 1000
          )
        ).padStart(2,"0");

      div.innerHTML += `

        <div class="cooldownAluno">

          <span>
            ${nome}
          </span>

          <span class="cooldownTempo">

            ${minutos}:${segundos}

          </span>

        </div>

      `;

    }

  });

},1000);