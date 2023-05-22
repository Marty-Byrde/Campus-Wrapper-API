import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import { join } from "path"
import * as dotenv from 'dotenv'
dotenv.config({ path: join(__dirname, ".env") })


const app: Express = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5gb' }));

app.listen(process.env.PORT, () => console.log(`Server has been started on port ${process.env.PORT}`))

app.get("/", (req: Request, res: Response) => {
    console.log("Root page loaded!")
    res.sendStatus(202)
})

app.post("/", (req: Request, res: Response) => {
    const body = req.body
    res.send(body)
})