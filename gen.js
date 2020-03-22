const nodeHtmlToImage = require('node-html-to-image')
const { Console } = require('console')
const fs = require('fs')
const fetch = require('node-fetch')
const sources = require('./sources.json')

process.setMaxListeners(0);

module.exports = {
    generateImages: function() {
        console.countReset('Images created');
        sources.news.forEach(source => {
            if (!fs.existsSync(source.imageFolder)){
                fs.mkdirSync(source.imageFolder);
            }
            const bgImgBase64 = fs.readFileSync(source.backgroundImage).toString('base64');
            if (source.source == 'rss') {
                 fetchJson(`https://api.rss2json.com/v1/api.json?rss_url=${source.feedURI}`)
                .then(posts => {
                    posts.items.forEach(post => {
                        genImg(post.title, bgImgBase64, source.imageFolder)
                    })
                })
            } else if (source.source == 'reddit') {
                fetchJson(`https://www.reddit.com/r/${source.feedURI}/hot.json`)
                .then(posts => {
                    posts.data.children.slice(0,10).forEach(post => {
                        genImg(post.data.title, bgImgBase64, source.imageFolder)
                    })
                })
            }
        })
    }
}

function genImg(news, bgImgBase64, imgPath) {
    let fontsize = news.length <= 130 ? '125px' : 125 - (news.length - 125)  + 'px'
    nodeHtmlToImage({
        output: imgPath + '/' + Date.now().toString() + '-' + Math.floor(Math.random() * 10000) + '.jpg',
        html: `
        <html>
            <head>
                <link href="https://fonts.googleapis.com/css?family=Lexend+Deca&display=swap" rel="stylesheet">
                <style>
                    body {
                        width: 1920px;
                        height: 1200px;
                        font-family: 'Lexend Deca', sans-serif;
                        color: white;
                        font-size: {{fnt}};
                        text-shadow: 5px 5px 15px #131313;
                    }
                    img {
                        position:absolute;
                        z-index:-1;
                    }
                    div {
                        margin-left: 100px;
                        width: 1720px;
                        height: 1200px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <img src='data:image/png;base64,{{imageSource}}' width='1920px' height='1200px'> 
                <div><span>{{headline}}</span></div>
            </body>
        </html>
        `,
        content: { imageSource: bgImgBase64, headline: news, fnt: fontsize },
        type: 'jpeg'
      }).then(() => console.count('Images created'))
}

function fetchJson(url) {
    return fetch(url).then(res => res.json())
}