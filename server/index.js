import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import {createServer} from 'node:http';
import dotenv from 'dotenv';
dotenv.config();
import { createClient} from "@libsql/client";
const port= process.env.PORT ?? 3000;

const app=express();
app.use(logger('dev'));
app.get('/',(req,res)=>{
    res.sendFile(process.cwd() + '/client/index.html');
    
})





const server= createServer(app);
const io=new Server(server,{
    connectionStateRecovery:{}
})

const db= createClient({
    url:'libsql://informed-outlaw-kid-facu.turso.io',
    authToken:process.env.DB_TOKEN
})

 await db.execute(`
    CREATE TABLE IF NOT EXISTS messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        user TEXT
    )  
    
`)


io.on('connection',async (socket)=>{
    console.log("a user has connected!");

    socket.on('disconnect',()=>{
        console.log('an user has disconnected')
    });
    socket.on('chat message',async(msg)=>{
       let resut;
       try{
        resut=await db.execute({
              sql: `INSERT INTO messages (content) VALUES (:content)`,
              args:{content: msg}

        })
       }catch(e){
            console.error(e)
            return
       }
        io.emit('chat message',msg, resut.lastInsertRowid.toString());  
    })
    console.log('auth');
    console.log(socket.handshake.auth);
    if(!socket.recovered){ //recuperar los msj sin conexion
        try{
            const result= await db.execute({
                sql:'SELECT id, content FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });
            result.rows.forEach(row=>{
                socket.emit('chat message', row.content, row.id.toString());
            })
        }catch(e){

        }
    }
})




server.listen(port, ()=>{
    console.log(`server runig on port ${port}`)
})


