var crawlerjs = require('crawler-js');
var jsdom = require("jsdom");
var fs = require('fs');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;

global.document = document;
var $ = jQuery = require('jquery')(window);
var newsDir = 'news/';

let getNewsUrl = () => {
    let news = {
        interval: 1000,
        getSample: 'https://br.investing.com/news/forex-news/',
        get: 'https://br.investing.com/news/forex-news/',
        preview: 0,
        extractors: [
            {
                selector: '#leftColumn .largeTitle article > a',
                callback: function(err,html,url,response) {
                    if(!err) {
                        let data = [];
                        $.each(html, function(i, item){
                            let linkCouple = {},
                                link = 'https://br.investing.com',
                                fileName = item.attribs.href;
                            
                            linkCouple.id = item.parent.attribs['data-id'];
                            linkCouple.name = fileName.split('/')[3];
                            linkCouple.url = link + item.attribs.href;
                            data.push(linkCouple);
                        });

                        getUrlCallback(data);
                     }else {
                        console.log(err);
                    }
                }
            }
        ]
    }

    crawlerjs(news);
}

let getUrlCallback = (data = []) => {
    data.forEach(function(news) { if(fs.existsSync(newsDir + news.id + '.txt')) delete news; });

    getNews(data);
}

let getNews = (data) => {
    data.forEach(function(news){
        crawlerjs({
            interval: 1000,
            getSample: 'https://br.investing.com/news/forex-news/',
            get: 'https://br.investing.com/news/forex-news/',
            preview: 0,
            extractors: [
                {
                    selector: '#leftColumn .largeTitle article > a',
                    callback: function(err,html,url,response) {
                        if(!err) {
                            let data = [];
                            $.each(html, function(i, item){
                                let linkCouple = {},
                                    link = 'https://br.investing.com',
                                    fileName = item.attribs.href;
                                
                                linkCouple.id = item.parent.attribs['data-id'];
                                linkCouple.name = fileName.split('/')[3];
                                linkCouple.url = link + item.attribs.href;
                                data.push(linkCouple);
                            });
    
                            getUrlCallback(data);
                         }else {
                            console.log(err);
                        }
                    }
                }
            ]
        });
    });
}

getNewsUrl();