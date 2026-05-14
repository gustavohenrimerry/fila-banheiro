const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
  transports: ["polling"]
});

app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>{
  res.json({status:"online",message:"Backend funcionando 🚀"});
});

let fila = [];
let historico = {}; // contador de vezes no banheiro
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

function norm(str){
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

io.on("connection", (socket)=>{
  // envia estado inicial
  socket.emit("filaAtualizada", fila);
  socket.emit("cooldownsAtualizados", cooldowns);
  socket.emit("contadorAtualizado", historico);

  /* =========================
     Entrar na fila
  ========================= */
  socket.on("entrarFila", nome=>{
    const input = norm(nome);
    const aluno = alunos.find(a=>norm(a).startsWith(input));
    if(!aluno) return socket.emit("erroNome","Nome incorreto");
    if(fila.find(f=>f.nome===aluno)) return socket.emit("erroNome","Já está na fila");
    if(cooldowns[aluno] && Date.now()<cooldowns[aluno]){
      const minutos = Math.ceil((cooldowns[aluno]-Date.now())/60000);
      return socket.emit("erroNome", `Espere ${minutos} minutos antes de entrar novamente`);
    }

    const inicioPrimeiro = fila[0]?.inicio || Date.now();
    fila.push({nome:aluno,entrada:Date.now(),inicio:fila.length===0?Date.now():inicioPrimeiro});
    io.emit("filaAtualizada", fila);
  });

  /* =========================
     Sair da fila
  ========================= */
  socket.on("sairFila", nome=>{
    const input = norm(nome);
    const primeiroAntes = fila[0]?.nome;
    fila = fila.filter(f=>!norm(f.nome).startsWith(input));

    // Se o primeiro mudou, reinicia timer e envia popup
    if(fila[0] && fila[0].nome !== primeiroAntes){
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }

    io.emit("filaAtualizada", fila);
  });

  /* =========================
     Próximo aluno
  ========================= */
  socket.on("proximoAluno", ()=>{
    if(fila.length===0) return;
    io.emit("vezAluno", fila[0].nome);
    io.emit("mostrarPopup", fila[0].nome);
  });

  /* =========================
     Aluno voltou
  ========================= */
  socket.on("alunoVoltou", ()=>{
    if(fila.length===0) return;

    const aluno = fila.shift();
    historico[aluno.nome] = (historico[aluno.nome]||0)+1;
    cooldowns[aluno.nome] = Date.now()+50*60*1000;

    // Reinicia timer do próximo aluno
    if(fila[0]){
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
  socket.on("moverCima", nome=>{
    const i = fila.findIndex(f=>norm(f.nome)===norm(nome));
    if(i<=0) return;
    [fila[i-1],fila[i]] = [fila[i],fila[i-1]];

    // Se o aluno virou o primeiro, reinicia timer e envia popup
    if(i-1===0){
      fila[0].inicio = Date.now();
      io.emit("vezAluno",fila[0].nome);
      io.emit("mostrarPopup",fila[0].nome);
    }

    io.emit("filaAtualizada",fila);
  });

  /* =========================
     Mover aluno para baixo
  ========================= */
  socket.on("moverBaixo", nome=>{
    const i = fila.findIndex(f=>norm(f.nome)===norm(nome));
    if(i===-1 || i>=fila.length-1) return;
    [fila[i],fila[i+1]] = [fila[i+1],fila[i]];
    io.emit("filaAtualizada",fila);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT,"0.0.0.0",()=>console.log("Servidor rodando na porta "+PORT));