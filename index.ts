import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import { join } from "path"
import * as dotenv from 'dotenv'
import fetch from "node-fetch"
import queue from 'express-queue';
dotenv.config({ path: join(__dirname, ".env") })

import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import * as fs from "fs";

let browser: Browser;

const app: Express = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5gb' }));
app.use(queue({ activeLimit: 10, queuedLimit: -1 }));

app.listen(process.env.PORT, async () => {
    console.log(`Server has been started on port ${process.env.PORT}`)
    await createPage()
})

app.get("/", (req: Request, res: Response) => {
    console.log("Root page loaded!")
    res.sendStatus(202)
})

app.post("/", (req: Request, res: Response) => {
    const body = req.body
    res.send(body)
})

let count = 1;
app.get("/course", async (req: Request, res: Response) => {
    const id = req.query.id as string
    console.log(`Handling incomming request for course: ${id}`)
    const html = await openCampusCoursePage(id)
    console.log(`${count++} Finished Handling ${id}`)
    res.send(html)
})

async function createPage() {
    if (!browser) browser = await puppeteer.launch({
        devtools: true,
        headless: "new",
    })
}

export async function openCampusCoursePage(id: string){
    const page = await browser.newPage()

    try{
        await page.goto(`https://campus.aau.at/studium/course/${id}`)
        const result = await page.waitForFunction(async ()=>{
            return await new Promise((resolve, reject) => {
                setInterval(function () {
                    try {
                        const hiddenSchedules = document.getElementById("weeklyEventsSparse")
                        if(document.getElementById("weeklyEventsGrouped").childElementCount == 0) resolve(true)

                        const loading = document.getElementById("loadingMsg")
                        if(loading) throw Error("Loading")

                        if (hiddenSchedules){
                            resolve(hiddenSchedules.children.length)
                            clearInterval(this)
                        }
                    } catch (e) {
                        console.log(e)
                    }
                }, 250); // Interval checkings
            })
        }, {timeout: 45 * 1000})

        const j = await result.remoteObject().value
        console.log()
        console.log(`There are ${j} schedules!`)

        const html = await page.evaluate(() => document.documentElement.innerHTML)
        await page.close()

        return html
    }catch(err){
        console.log(`Error while opening course page: ${id}`)
        console.log(err.stackTrace)
    }


}