const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
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

// normalização forte (resolve GUSTAVO / Gustavo / gustavo / acento)
function norm(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

io.on("connection", (socket) => {

  socket.emit("filaAtualizada", fila);
  socket.emit("cooldownsAtualizados", cooldowns);
  socket.emit("contadorAtualizado", historico);

  /* =========================
     ENTRAR NA FILA (SEM RESET)
  ========================= */
  socket.on("entrarFila", (nome) => {

    const input = norm(nome);

    const aluno = alunos.find(a => {
      const n = norm(a);
      return n === input || n.startsWith(input);
    });

    if (!aluno) {
      socket.emit("erroNome", "Nome incorreto");
      return;
    }

    const jaExiste = fila.some(f => norm(f.nome) === norm(aluno));

    if (jaExiste) {
      socket.emit("erroNome", "Já está na fila");
      return;
    }

    fila.push({
      nome: aluno,
      entrada: Date.now()
    });

    io.emit("filaAtualizada", fila);
  });

  /* =========================
     SAIR DA FILA
  ========================= */
  socket.on("sairFila", (nome) => {

    const input = norm(nome);

    const antes = fila.length;

    fila = fila.filter(f =>
      norm(f.nome) !== input &&
      !norm(f.nome).startsWith(input)
    );

    if (fila.length !== antes) {
      io.emit("filaAtualizada", fila);
    }
  });

  /* =========================
     PRÓXIMO ALUNO
  ========================= */
  socket.on("proximoAluno", () => {
    if (fila.length === 0) return;

    io.emit("vezAluno", fila[0].nome);
    io.emit("mostrarPopup", fila[0].nome);
  });

  /* =========================
     ALUNO VOLTOU
  ========================= */
  socket.on("alunoVoltou", () => {

    if (fila.length === 0) return;

    const aluno = fila.shift();

    historico[aluno.nome] = (historico[aluno.nome] || 0) + 1;

    cooldowns[aluno.nome] = Date.now() + 50 * 60 * 1000;

    io.emit("filaAtualizada", fila);
    io.emit("cooldownsAtualizados", cooldowns);
    io.emit("contadorAtualizado", historico);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});