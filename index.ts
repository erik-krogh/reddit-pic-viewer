/*
 * A server that fetches a random image from the specified subreddit and
 * scales it to 1920x1080.
 */

import express from "express";
import got from "got";
import sharp from "sharp";
import * as fs from "fs";

const app = express();

app.get("/", async (req, res) => {
  try {
    await retry(async () => await serverSubreddit("EarthPorn", res));
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
});

// host:port/subreddit
app.get("/:subreddit", async (req, res) => {
  try {
    const subreddit = req.params.subreddit;
    if (subreddit === "favicon.ico") {
      res.status(404).send("Not Found");
      return;
    }
    console.log("SubReddit: " + subreddit);
    await retry(async () => await serverSubreddit(subreddit, res));
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
});

async function retry<T>(fn: () => Promise<T>, retries: number = 5): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) {
      throw e;
    }
    return retry(fn, retries - 1);
  }
}

async function serverSubreddit(subreddit: string, res: express.Response) {
  const url =
    "https://www.reddit.com/r/" +
    subreddit +
    "/top.json?show=all&limit=25&sort=top&t=week";

  console.log(url);
  const response = await got(url, { throwHttpErrors: false });
  const json = JSON.parse(response.body);
  const post = json.data.children[Math.floor(Math.random() * 25)].data;
  const imageUrl = post.url;
  console.log("imageUrl: " + imageUrl);
  const image = await got(imageUrl, { throwHttpErrors: false });
  const imageBuffer = image.rawBody;
  const resultBuffer = await sharp(imageBuffer)
    .resize(1920, 1080, { fit: "outside" })
    .extract({
      width: 1920,
      height: 1080,
      left: 0,
      top: 0,
    })
    .jpeg()
    .toBuffer();

  res.setHeader("Content-Type", "image/jpeg");
  res.send(resultBuffer);
  res.end();
}

// port is first argument (or default 8080)

const port = process.argv[2] || 8080;
app.listen(port, () => {
  console.log("Listening on port " + port);
});
