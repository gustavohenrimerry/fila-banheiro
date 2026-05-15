const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] },
  transports: ["polling"]
});

app.use(cors());
app.use(express.json());

// Supabase
const SUPABASE_URL = "https://znmhugrbhfovzavjgeax.supabase.co";
const SUPABASE_KEY = "sb_publishable_0BNQcFQ7Io47lW8iKDU_7g_rTGxcia0";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get("/", (req,res)=>{
  res.json({status:"online", message:"Backend funcionando 🚀"});
});

let fila = [];

function norm(str){
  return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}

io.on("connection", async (socket)=>{
  socket.emit("filaAtualizada", fila);

  // Carrega alunos do banco
  const { data: alunosDB, error } = await supabase.from("alunos").select("*");
  const cooldowns = {};
  const historico = {};
  if(!error){
    alunosDB.forEach(a=>{
      if(a.cooldown) cooldowns[a.nome] = new Date(a.cooldown).getTime();
      historico[a.nome] = a.vezes_no_banheiro || 0;
    });
  }
  socket.emit("cooldownsAtualizados", cooldowns);
  socket.emit("contadorAtualizado", historico);

  /* Entrar na fila */
  socket.on("entrarFila", async (nome)=>{
    const input = norm(nome);
    const alunoData = alunosDB.find(a => norm(a.nome).startsWith(input));
    if(!alunoData) return socket.emit("erroNome","Nome incorreto");
    if(fila.find(f => f.nome === alunoData.nome)) return socket.emit("erroNome","Já está na fila");
    if(alunoData.cooldown && new Date(alunoData.cooldown) > new Date()) return socket.emit("erroNome","Espere o cooldown terminar");

    fila.push({nome: alunoData.nome, entrada: Date.now(), inicio: fila.length===0 ? Date.now() : fila[0]?.inicio});
    io.emit("filaAtualizada", fila);
  });

  /* Sair da fila */
  socket.on("sairFila", nome=>{
    const primeiroAntes = fila[0]?.nome;
    fila = fila.filter(f => !norm(f.nome).startsWith(norm(nome)));
    if(fila[0] && fila[0].nome !== primeiroAntes){
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }
    io.emit("filaAtualizada", fila);
  });

  /* Próximo aluno */
  socket.on("proximoAluno", ()=>{
    if(fila.length===0) return;
    io.emit("vezAluno", fila[0].nome);
    io.emit("mostrarPopup", fila[0].nome);
  });

  /* Aluno voltou */
  socket.on("alunoVoltou", async ()=>{
    if(fila.length===0) return;
    const alunoAtual = fila.shift();

    // Atualiza banco: incrementa vezes e define cooldown
    await supabase.from("alunos").update({
      vezes_no_banheiro: supabase.raw("vezes_no_banheiro + 1"),
      cooldown: new Date(Date.now()+50*60*1000)
    }).eq("nome", alunoAtual.nome);

    if(fila[0]){
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }

    io.emit("filaAtualizada", fila);
  });

  /* Mover aluno */
  socket.on("moverCima", nome=>{
    const i = fila.findIndex(f=>norm(f.nome)===norm(nome));
    if(i<=0) return;
    [fila[i-1],fila[i]] = [fila[i],fila[i-1]];
    if(i-1===0){
      fila[0].inicio = Date.now();
      io.emit("vezAluno", fila[0].nome);
      io.emit("mostrarPopup", fila[0].nome);
    }
    io.emit("filaAtualizada", fila);
  });

  socket.on("moverBaixo", nome=>{
    const i = fila.findIndex(f=>norm(f.nome)===norm(nome));
    if(i===-1 || i>=fila.length-1) return;
    [fila[i],fila[i+1]] = [fila[i+1],fila[i]];
    io.emit("filaAtualizada", fila);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,"0.0.0.0",()=>console.log("Servidor rodando na porta "+PORT));