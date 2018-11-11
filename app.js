var crawlerjs = require('crawler-js');
var jsdom = require("jsdom");
var fs = require('fs');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
const cheerio = require('cheerio');

global.document = document;
var jQuery = require('jquery')(window);
var newsDir = 'news/';

let newsToGet = [],
    newsUrl = [];

let getNewsUrl = () => {
    console.log("Crawling to get New's Urls. ");
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
                        jQuery.each(html, function(i, item){
                            let newsCollection = {},
                                link = 'https://br.investing.com',
                                fileName = item.attribs.href;
                            
                            newsCollection.id = item.parent.attribs['data-id'];
                            newsCollection.name = fileName.split('/')[3];
                            newsCollection.url = link + item.attribs.href;
                            newsUrl.push(newsCollection);
                        });

                     }else {
                        console.log(err);
                    }
                }
            }
        ]
    });
    setTimeout(getUrlCallback, 5000);
}

let getUrlCallback = () => {
    console.log("Crawling to get New's Urls. done!");
    console.log('Searching for duplicated urls in collection.');
    
    let currentUrls = [], delletions = 0;
    newsUrl.forEach(function(news) {
        let existInNewsUrl = false;
        newsToGet.forEach(function(notice){
            if(fs.existsSync(newsDir + notice.name + '.txt') || notice.id === news.id) {
                delletions++;
                existInNewsUrl = true;
            }
        });
        if(!existInNewsUrl) currentUrls.push(news);
    });

    newsUrl = currentUrls;

    if(newsUrl.length > 0) {
        newsUrl.forEach(function(notice) { 
            newsToGet.push(notice);
        });
    }
    console.log('Searching for duplicated urls in collection. done!');
    console.log("We've got "+ newsUrl.length + " added and "+ delletions+ " removed.");
    newsUrl = [];
    verifyNewsContent();
}

let verifyNewsContent = () => {
    console.log("Verifying NewsToGet collection. ");
    if(newsToGet.length > 0) {
        console.log("We have "+ newsToGet.length +" news to get.");
        setTimeout(getNews, 500);
    } else {
        console.log("We have no news to get. Configuring new check in 60s.");
        setTimeout(getNewsUrl, 60000);
    }
};

let getNews = () => {
    if(newsToGet.length > 0) {
        console.log("Starting queue process to get the actual notice. Queue amount: "+ newsToGet.length);

        let currentNoticeConfig = newsToGet[newsToGet.length - 1];
        newsToGet.pop();
        crawlerjs({
            interval: 1000,
            getSample: currentNoticeConfig.url,
            get: currentNoticeConfig.url,
            preview: 0,
            extractors: [
                {
                    selector: '#leftColumn',
                    callback: function(err,html,url,response) {
                        console.log('Crawling: '+ currentNoticeConfig.url);
                        let articleText = '';
                        if(!err) {
                            let test = [];
                            let { window } = new JSDOM();
                            let { document }  = (new JSDOM(html)).window;
                            let $ = require('jquery')(window);
                            console.log($('.articlePage').text());
                        }else {
                            console.log(err);
                        }
                    }
                }
            ]
        });
        if(newsToGet.length > 0) {
            console.log('Next search occurs in 10s.')
            setTimeout(getNews, 10000);
        }
    } else {
        console.log("We have no news to get. Configuring new check in 10s.");
        setTimeout(getNewsUrl, 10000);
    }
}

getNewsUrl();