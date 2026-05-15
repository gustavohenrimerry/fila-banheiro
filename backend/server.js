const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["polling"]
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "online", message: "Backend funcionando 🚀" });
});

// Supabase
const SUPABASE_URL = "https://znmhugrbhfovzavjgeax.supabase.co";
const SUPABASE_KEY = "sb_publishable_0BNQcFQ7Io47lW8iKDU_7g_rTGxcia0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let fila = [];
let historico = {}; // vezes no banheiro
const cooldowns = {};

// Normaliza o nome
function norm(str) {
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Busca alunos do Supabase
async function getAlunosDB() {
  try {
    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error("Erro ao buscar alunos:", error);
      return [];
    }
    return data.map(a => a.nome);
  } catch (err) {
    console.error("Erro inesperado ao buscar alunos:", err);
    return [];
  }
}

io.on("connection", (socket) => {

  // Busca alunos do DB dentro de um bloco seguro async
  (async () => {
    try {
      const alunosDB = await getAlunosDB();
      socket.emit("alunosAtualizados", alunosDB);
    } catch (err) {
      console.error("Erro ao carregar alunos:", err);
      socket.emit("alunosAtualizados", []); // envia lista vazia se der erro
    }
  })();

  // Envia estado inicial
  socket.emit("filaAtualizada", fila);
  socket.emit("cooldownsAtualizados", cooldowns);
  socket.emit("contadorAtualizado", historico);

  /* =========================
     Entrar na fila
  ========================= */
  socket.on("entrarFila", (nome) => {
    const input = norm(nome);
    if (!alunosDB.find(a => norm(a).startsWith(input))) {
      return socket.emit("erroNome", "Nome incorreto");
    }
    if (fila.find(f => f.nome === nome)) {
      return socket.emit("erroNome", "Já está na fila");
    }
    if (cooldowns[nome] && Date.now() < cooldowns[nome]) {
      const minutos = Math.ceil((cooldowns[nome] - Date.now()) / 60000);
      return socket.emit("erroNome", `Espere ${minutos} minutos antes de entrar novamente`);
    }

    fila.push({ nome, entrada: Date.now(), inicio: fila.length === 0 ? Date.now() : fila[0]?.inicio });
    io.emit("filaAtualizada", fila);
  });

  /* =========================
     Sair da fila
  ========================= */
  socket.on("sairFila", (nome) => {
    const primeiroAntes = fila[0]?.nome;
    fila = fila.filter(f => f.nome !== nome);
    if (fila[0] && fila[0].nome !== primeiroAntes) {
      // Reinicia timer do novo primeiro aluno
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }
    io.emit("filaAtualizada", fila);
  });

  /* =========================
     Próximo aluno
  ========================= */
  socket.on("proximoAluno", () => {
    if (fila.length === 0) return;
    io.emit("vezAluno", fila[0].nome);
    io.emit("mostrarPopup", fila[0].nome);
  });

  /* =========================
     Aluno voltou
  ========================= */
  socket.on("alunoVoltou", () => {
    if (fila.length === 0) return;

    const aluno = fila.shift();
    historico[aluno.nome] = (historico[aluno.nome] || 0) + 1;
    cooldowns[aluno.nome] = Date.now() + 50 * 60 * 1000; // 50 min

    if (fila[0]) {
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }

    io.emit("filaAtualizada", fila);
    io.emit("cooldownsAtualizados", cooldowns);
    io.emit("contadorAtualizado", historico);
  });

  /* =========================
     Mover aluno para cima
  ========================= */
  socket.on("moverCima", (nome) => {
    const i = fila.findIndex(f => f.nome === nome);
    if (i <= 0) return;
    [fila[i-1], fila[i]] = [fila[i], fila[i-1]];

    if (i-1 === 0) {
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }
    io.emit("filaAtualizada", fila);
  });

  /* =========================
     Mover aluno para baixo
  ========================= */
  socket.on("moverBaixo", (nome) => {
    const i = fila.findIndex(f => f.nome === nome);
    if (i === -1 || i >= fila.length-1) return;
    [fila[i], fila[i+1]] = [fila[i+1], fila[i]];
    io.emit("filaAtualizada", fila);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("Servidor rodando na porta " + PORT));