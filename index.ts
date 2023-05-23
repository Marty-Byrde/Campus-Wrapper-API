import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import { join } from "path"
import * as dotenv from 'dotenv'

dotenv.config({ path: join(__dirname, ".env") })

import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';

let browser: Browser;

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

app.get("/course", async (req: Request, res: Response) => {
    const { href } = req.body
    const html = await openCampusCoursePage(href)
    res.send(html)
})

async function createPage() {
    if (!browser) browser = await puppeteer.launch({
        devtools: true,
        headless: "new",
    })

    return await browser.newPage()
}

export async function openCampusCoursePage(href: string){
    const page = await createPage()

    await page.goto(href)
    await page.waitForFunction(async ()=>{
        return await new Promise((resolve, reject) => {
            setInterval(function () {
                try {
                    const hiddenSchedules = document.getElementById("weeklyEventsSparse")


                    if (hiddenSchedules){
                        resolve(true)
                        clearInterval(this)
                    }
                } catch (e) {
                    console.log(e)
                }
            }, 250); // Interval checkings
        })
    }, {timeout: 45 * 1000})

    const html = await page.evaluate(() => document.documentElement.innerHTML)
    await page.close()

    return html
}