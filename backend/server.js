const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "online", message: "Backend da fila funcionando 🚀" });
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

// Normaliza o nome (remove acentos e caixa)
function norm(str) {
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

io.on("connection", (socket) => {

  // envia estado inicial
  socket.emit("filaAtualizada", fila);
  socket.emit("cooldownsAtualizados", cooldowns);

  // ENTRAR NA FILA
  socket.on("entrarFila", (nome) => {
    const input = norm(nome);
    const aluno = alunos.find(a => norm(a).startsWith(input));

    if (!aluno) {
      socket.emit("erroNome", "Nome incorreto");
      return;
    }

    // Verifica se já está na fila
    if (fila.find(f => f.nome === aluno)) {
      socket.emit("erroNome", "Já está na fila");
      return;
    }

    // Verifica cooldown
    if (cooldowns[aluno] && Date.now() < cooldowns[aluno]) {
      const minutos = Math.ceil((cooldowns[aluno] - Date.now()) / 60000);
      socket.emit("erroNome", `Espere ${minutos} minutos antes de entrar novamente`);
      return;
    }

    // Mantém timer do primeiro aluno
    const inicioPrimeiro = fila[0]?.inicio || Date.now();

    fila.push({
      nome: aluno,
      entrada: Date.now(),
      inicio: fila.length === 0 ? Date.now() : inicioPrimeiro
    });

    io.emit("filaAtualizada", fila);
  });

  // SAIR DA FILA
  socket.on("sairFila", (nome) => {
    const input = norm(nome);
    fila = fila.filter(f => !norm(f.nome).startsWith(input));

    // Atualiza timer do primeiro aluno se necessário
    if (fila[0] && !fila[0].inicio) fila[0].inicio = Date.now();

    io.emit("filaAtualizada", fila);
  });

  // AVISAR PRÓXIMO
  socket.on("proximoAluno", () => {
    if (fila.length === 0) return;
    io.emit("vezAluno", fila[0].nome);
    io.emit("mostrarPopup", fila[0].nome);
  });

  // ALUNO VOLTOU
  socket.on("alunoVoltou", () => {
    if (fila.length === 0) return;

    const aluno = fila.shift();
    historico[aluno.nome] = (historico[aluno.nome] || 0) + 1;

    // Define cooldown de 50 min
    cooldowns[aluno.nome] = Date.now() + 50 * 60 * 1000;

    // Mantém timer do próximo aluno
    if (fila[0] && !fila[0].inicio) fila[0].inicio = Date.now();

    io.emit("filaAtualizada", fila);
    io.emit("cooldownsAtualizados", cooldowns);
  });

  // MOVER ALUNO PARA FRENTE (professor)
  socket.on("moverParaFrente", (nomeAluno) => {
    const index = fila.findIndex(f => norm(f.nome) === norm(nomeAluno));
    if(index <= 0) return; // já está na frente ou não existe
    const [aluno] = fila.splice(index,1);
    fila.unshift(aluno);

    // Atualiza timer do primeiro aluno
    fila[0].inicio = fila[0].inicio || Date.now();

    io.emit("filaAtualizada", fila);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("Servidor rodando na porta " + PORT));