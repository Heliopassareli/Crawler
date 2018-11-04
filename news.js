var request = require('request');
var cheerio = require('cheerio');
var fs      = require('fs');

let getNewsUrl = () => {
    request('https://br.investing.com/news/forex-news/', function(err, res, body){
        if(err) console.log('Error: ' + err);
console.log(err);
console.log(res);
        let $ = cheerio.load(body);
        $('#leftColumn .largeTitle article .textDiv a').each(function(){
            let link = 'https://br.investing.com';
            let url  = link + $(this).attr('href');
            console.log(url);
            //fs.appendFile('imdb.txt', title + ' - ' + rating + '\n');
        });
    });
}

getNewsUrl();