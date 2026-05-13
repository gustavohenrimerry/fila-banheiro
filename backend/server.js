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
let historico = [];
const cooldowns = {};
const contadorBanheiro = {};

const alunos = [/* mantém sua lista igual */];

io.on("connection", (socket) => {

  socket.emit("filaAtualizada", fila);
  socket.emit("contadorAtualizado", contadorBanheiro);
  socket.emit("cooldownsAtualizados", cooldowns);

  // ENTRAR
  socket.on("entrarFila", (nome) => {

    const nomeDigitado = nome.trim().toLowerCase();

    const alunoCompleto = alunos.find(a =>
      a.toLowerCase() === nomeDigitado ||
      a.toLowerCase().startsWith(nomeDigitado)
    );

    if (!alunoCompleto) {
      socket.emit("erroNome", "Nome Incorreto");
      return;
    }

    const existe = fila.find(a => a.nome === alunoCompleto);

    if (existe) {
      socket.emit("erroNome", "Você já está na fila");
      return;
    }

    fila.push({
      nome: alunoCompleto,
      status: "Na fila",
      entrada: new Date(),
      inicioBanheiro: fila.length === 0 ? Date.now() : null
    });

    io.emit("filaAtualizada", fila);
  });

  // SAIR (CORRIGIDO)
  socket.on("sairFila", (nome) => {

    const nomeNormalizado = nome.trim().toLowerCase();

    fila = fila.filter(a =>
      a.nome.toLowerCase() !== nomeNormalizado &&
      !a.nome.toLowerCase().startsWith(nomeNormalizado)
    );

    io.emit("filaAtualizada", fila);
  });

  // PRÓXIMO
  socket.on("proximoAluno", () => {
    if (fila.length > 0) {
      io.emit("vezAluno", fila[0].nome);
    }
  });

  // VOLTOU
  socket.on("alunoVoltou", () => {

    if (fila.length > 0) {

      const alunoAtual = fila.shift();

      historico.push({
        nome: alunoAtual.nome,
        entrada: alunoAtual.entrada,
        saida: new Date()
      });

      contadorBanheiro[alunoAtual.nome] =
        (contadorBanheiro[alunoAtual.nome] || 0) + 1;

      cooldowns[alunoAtual.nome] =
        Date.now() + (50 * 60 * 1000);

      io.emit("contadorAtualizado", contadorBanheiro);
      io.emit("cooldownsAtualizados", cooldowns);
      io.emit("filaAtualizada", fila);

      if (fila.length > 0) {
        io.emit("mostrarPopup", fila[0].nome);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});