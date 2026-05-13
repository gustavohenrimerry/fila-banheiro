const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"]
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Backend da fila funcionando 🚀"
  });
});

let fila = [];
let historico = {};
const cooldowns = {};

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

function norm(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

io.on("connection", (socket) => {

  socket.emit("filaAtualizada", fila);
  socket.emit("cooldownsAtualizados", cooldowns);
  socket.emit("contadorAtualizado", historico);

  /* =========================
     ENTRAR FILA
  ========================= */

  socket.on("entrarFila", (nome) => {

    const input = norm(nome);

    const aluno = alunos.find(a =>
      norm(a).startsWith(input)
    );

    if (!aluno) {
      socket.emit("erroNome", "Nome incorreto");
      return;
    }

    if (fila.find(f => f.nome === aluno)) {
      socket.emit("erroNome", "Já está na fila");
      return;
    }

    if (
      cooldowns[aluno]
      &&
      Date.now() < cooldowns[aluno]
    ) {

      const minutos = Math.ceil(
        (cooldowns[aluno] - Date.now()) / 60000
      );

      socket.emit(
        "erroNome",
        `Espere ${minutos} minutos antes de entrar novamente`
      );

      return;
    }

    fila.push({
      nome: aluno,
      entrada: Date.now(),
      inicio:
        fila.length === 0
          ? Date.now()
          : null
    });

    io.emit("filaAtualizada", fila);

  });

  /* =========================
     SAIR FILA
  ========================= */

  socket.on("sairFila", (nome) => {

    const input = norm(nome);

    fila = fila.filter(f =>
      !norm(f.nome).startsWith(input)
    );

    io.emit("filaAtualizada", fila);

  });

  /* =========================
     AVISAR ALUNO
  ========================= */

  socket.on("proximoAluno", () => {

    if (fila.length === 0) return;

    io.emit("vezAluno", fila[0].nome);

    io.emit(
      "mostrarPopup",
      fila[0].nome
    );

  });

  /* =========================
     ALUNO VOLTOU
  ========================= */

  socket.on("alunoVoltou", () => {

    if (fila.length === 0) return;

    const aluno = fila.shift();

    historico[aluno.nome] =
      (historico[aluno.nome] || 0) + 1;

    cooldowns[aluno.nome] =
      Date.now() + (50 * 60 * 1000);

    // NOVO PRIMEIRO
    if (fila[0]) {

      // REINICIA TIMER
      fila[0].inicio = Date.now();

      // AVISA NOVO PRIMEIRO
      io.emit(
        "vezAluno",
        fila[0].nome
      );

      io.emit(
        "mostrarPopup",
        fila[0].nome
      );

    }

    io.emit("filaAtualizada", fila);
    io.emit("cooldownsAtualizados", cooldowns);
    io.emit("contadorAtualizado", historico);

  });

  /* =========================
     MOVER CIMA
  ========================= */

  socket.on("moverCima", (nomeAluno) => {

    const index = fila.findIndex(f =>
      norm(f.nome) === norm(nomeAluno)
    );

    if (index <= 0) return;

    const temp = fila[index - 1];
    fila[index - 1] = fila[index];
    fila[index] = temp;

    // SE VIROU PRIMEIRO
    if (index - 1 === 0) {

      // REINICIA TIMER
      fila[0].inicio = Date.now();

      // MOSTRA POPUP
      io.emit(
        "vezAluno",
        fila[0].nome
      );

      io.emit(
        "mostrarPopup",
        fila[0].nome
      );

    }

    io.emit("filaAtualizada", fila);

  });

  /* =========================
     MOVER BAIXO
  ========================= */

  socket.on("moverBaixo", (nomeAluno) => {

    const index = fila.findIndex(f =>
      norm(f.nome) === norm(nomeAluno)
    );

    if (
      index === -1
      ||
      index >= fila.length - 1
    ) return;

    const temp = fila[index + 1];
    fila[index + 1] = fila[index];
    fila[index] = temp;

    io.emit("filaAtualizada", fila);

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    "Servidor rodando na porta " + PORT
  );

});