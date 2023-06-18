import express, { Express, Request, Response } from "express"
import bodyParser from "body-parser"
import { join } from "path"
import * as dotenv from 'dotenv'
import queue from 'express-queue';
import * as puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import * as fs from "fs";
import {readdirSync, readFileSync} from "fs";


dotenv.config({ path: join(__dirname, ".env") })
const app: Express = express()
let browser: Browser;
let count = 1;
const cache = new Map<string, string>()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5gb' }));
app.use(queue({ activeLimit: 10, queuedLimit: -1 }));

app.listen(process.env.PORT, async () => {
    console.log(`Server has been started on port ${process.env.PORT}`)
    await createPage()
    readdirSync("./cache").forEach(file => {
        const content = readFileSync(`./cache/${file}`)
        cache.set(file.split("_")[1].split(".")[0], content.toString())
    })
})

app.get("/", (req: Request, res: Response) => {
    console.log("Root page loaded!")
    res.sendStatus(202)
})

app.post("/", (req: Request, res: Response) => {
    const body = req.body
    res.send(body)
})


app.get("/course", async (req: Request, res: Response) => {
    const id = req.query.id as string
    if(cache.has(id)){
        console.log(`Cache hit for course: ${id}`)
        res.send(cache.get(id))
        return
    }

    console.log(`Handling incomming request for course: ${id}`)
    const html = await openCampusCoursePage(id)
    console.log(`${count++} Finished Handling ${id}`)

    //? caching results
    fs.writeFileSync(`./cache/course_${id}.html`, html)
    res.send(html)
})

app.post("/results", async (req: Request, res: Response) => {
    const body = req.body
    fs.writeFile("./transfer.json", JSON.stringify(body), ()=>{})
    console.log(body)
    res.send("OK")
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

        const imgs = await page.evaluate(async () => {
            const informationConainer = document.getElementById("card-content-uebersicht")
            const table = informationConainer.getElementsByTagName("dl")[0]

            const images = []

            const contributorContainer = table.children.item(1)
            const contributors = contributorContainer.getElementsByTagName("ul")[0].children

            for(let contributor of contributors){
                console.log(contributor)
                const name = contributor.getElementsByTagName("a")[0]
                console.log(name)

                name.click()
                name.click()

                await new Promise((resolve, reject) => setTimeout(() => resolve(true), 1000))
                await new Promise((resolve, reject) => {
                    setInterval(() => {
                        const popover = document.getElementsByClassName("popover-img")
                        if(popover.length === 0) return

                        resolve(true)

                    }, 100)
                })

                const popover = name.getAttribute("aria-describedby")

                let img = document.getElementById(popover).getElementsByClassName("popover-img")
                if(img.length > 0){
                    images.push(`https://campus.aau.at${img[0].getAttribute("src")}`)
                    console.log(`New contributor image: ${images.at(-1)}`)

                }else{
                    console.log("couldnt load the img of an contributor!")
                }
            }
            return images
        })

        const html = await page.evaluate((imgs) => {
            const script = document.createElement("script")
            script.id = "contributor-images"
            script.type = "application/json"
            script.innerHTML = JSON.stringify(imgs)

            document.documentElement.append(script)

            return document.documentElement.innerHTML
        }, imgs)



        await page.close()
        return html
    }catch(err){
        console.log(`Error while opening course page: ${id}`)
        console.log(err)
    }


}