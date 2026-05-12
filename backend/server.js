// TROQUE TODO O backend/server.js POR ESTE

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());

let fila = [];
let historico = [];

const cooldowns = {};
const contadorBanheiro = {};

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

io.on("connection", (socket) => {

  socket.emit(
    "filaAtualizada",
    fila
  );

  socket.emit(
    "contadorAtualizado",
    contadorBanheiro
  );

  socket.emit(
    "cooldownsAtualizados",
    cooldowns
  );

  // ENTRAR FILA

  socket.on("entrarFila", (nome) => {

    const nomeDigitado =
      nome
      .trim()
      .toLowerCase();

    const alunoCompleto =
      alunos.find(aluno => {

        const nomeLower =
          aluno.toLowerCase();

        return (
          nomeLower === nomeDigitado
          ||
          nomeLower.startsWith(
            nomeDigitado + " "
          )
        );

      });

    // NOME ERRADO

    if(!alunoCompleto){

      socket.emit(
        "erroNome",
        "Nome Incorreto"
      );

      return;

    }

    // JÁ ESTÁ FILA

    const existe =
      fila.find(
        a => a.nome === alunoCompleto
      );

    if(existe){

      socket.emit(
        "erroNome",
        "Você já está na fila"
      );

      return;

    }

    // COOLDOWN

    if(cooldowns[alunoCompleto]){

      const agora =
        Date.now();

      const fimCooldown =
        cooldowns[alunoCompleto];

      if(agora < fimCooldown){

        const minutos =
          Math.ceil(
            (fimCooldown - agora)
            / 60000
          );

        socket.emit(
          "erroNome",
          `Espere ${minutos} minutos para ir ao banheiro novamente`
        );

        return;

      }

    }

    // ENTRAR FILA

    fila.push({

      nome: alunoCompleto,
      status: "Na fila",
      entrada: new Date(),

      // TIMER COMEÇA AUTOMÁTICO

      inicioBanheiro:
        fila.length === 0
        ? Date.now()
        : null

    });

    io.emit(
      "filaAtualizada",
      [...fila]
    );

  });

  // SAIR FILA

  socket.on("sairFila", (nome) => {

    fila =
      fila.filter(
        a => a.nome !== nome
      );

    io.emit(
      "filaAtualizada",
      [...fila]
    );

  });

  // AVISAR ALUNO

  socket.on("proximoAluno", () => {

    if(fila.length > 0){

      io.emit(
        "filaAtualizada",
        [...fila]
      );

      io.emit(
        "vezAluno",
        fila[0].nome
      );

    }

  });

  // ALUNO VOLTOU

  socket.on("alunoVoltou", () => {

    if(fila.length > 0){

      const alunoAtual =
        fila.shift();

      // HISTÓRICO

      historico.push({

        nome: alunoAtual.nome,
        entrada: alunoAtual.entrada,
        saida: new Date()

      });

      // CONTADOR

      contadorBanheiro[
        alunoAtual.nome
      ] =
        (
          contadorBanheiro[
            alunoAtual.nome
          ] || 0
        ) + 1;

      // COOLDOWN

      cooldowns[
        alunoAtual.nome
      ] =
        Date.now()
        +
        (50 * 60 * 1000);

      // NOVO PRIMEIRO
      // COMEÇA TIMER

      if(fila.length > 0){

        fila[0].inicioBanheiro =
          Date.now();

      }

      io.emit(
        "contadorAtualizado",
        contadorBanheiro
      );

      io.emit(
        "cooldownsAtualizados",
        cooldowns
      );

      io.emit(
        "filaAtualizada",
        [...fila]
      );

      // POPUP

      if(fila.length > 0){

        io.emit(
          "mostrarPopup",
          fila[0].nome
        );

      }

    }

  });

});

app.use(
  express.static(
    path.join(
      __dirname,
      "../frontend"
    )
  )
);

server.listen(3000, () => {

  console.log(
    "Servidor rodando na porta 3000"
  );

});