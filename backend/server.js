const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { URL } = require('url');

const app = express();
app.use(cors());
app.use(express.json());

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const fetchAndCheckUrl = async (url) => {
  if (url.startsWith('javascript:void(0)') || url.startsWith('tel:')) {
    return 'OK';
  }

  if (!isValidUrl(url)) {
    return 'Invalid URL';
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 10, // Limit the number of redirects to avoid infinite loops
      validateStatus: (status) => {
        return !(status === 400 || status === 404 || status === 410 || status === 502 || status === 408 || status === 503);
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    return { status: response.status, headers: response.headers };
  } catch (error) {
    if (error.response) {
      return { status: error.response.status };
    } else if (error.code === 'ERR_TOO_MANY_REDIRECTS') {
      return { status: 'Too Many Redirects' };
    }
    console.error(`Error checking URL: ${url}`, error.message);
    return { status: 'Error' };
  }
};

const requiredMetaTags = [
  'og:title', 'og:image', 'twitter:image', 'twitter:url',
  'og:url', 'twitter:description', 'og:description'
];

app.post('/check-urls', async (req, res) => {
  const parentUrls = req.body.urls;
  const results = await Promise.all(parentUrls.map(async (parentUrl) => {
    if (!isValidUrl(parentUrl)) {
      return { parentUrl, links: [{ url: null, status: 'Invalid URL' }] };
    }

    try {
      const response = await axios.get(parentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);

      // Extract links
      const links = [];
      $('a[href]').each((i, link) => {
        const href = $(link).attr('href');
        if (href && isValidUrl(href)) {
          links.push(href);
        }
      });

      // Extract images
      const images = [];
      $('img').each((i, img) => {
        images.push({
          src: $(img).attr('src'),
          alt: $(img).attr('alt') || 'No alt text'
        });
      });

      const videos = []
      $('universal-media-player').each((i,umpElem) => {
        const optionsString = $(umpElem).attr('options');
            const options = JSON.parse(optionsString.replace(/&quot;/g, '"'));
            
            const link = options.sources.find(source => source.quality === 'HQ').src; 
            const modifiedlink = link.split('en-us')[0] + 'en-us';
            const ccFiles  = options.ccFiles.map(ccfile => ccfile.url) 
            const downloadableFiles = options.downloadableFiles.map(ccfile => ccfile.url) 
            const title = options.title;
            videos.push({ type:'video', src: modifiedlink,ccFiles,downloadableFiles });
    });

      // Extract ARIA labels
      const ariaElements = [];
      $('[aria-label]').each((i, element) => {
        ariaElements.push({
          element: $(element).prop('tagName').toLowerCase(),
          ariaLabel: $(element).attr('aria-label'),
          target: $(element).attr('href') || '',
          link: $(element).attr('href') || $(element).closest('a').attr('href') || ''
        });
        // console.log(ariaElements)
      });

      // Extract meta tags
      const metaTags = [];
      $('meta').each((i, meta) => {
        const name = $(meta).attr('name') || $(meta).attr('property') || $(meta).attr('http-equiv');
        if (name) {
          metaTags.push(name);
        }
      });

      // Identify missing meta tags
      const missingMetaTags = requiredMetaTags.filter(tag => !metaTags.includes(tag));

      // Check all links
      const linkStatuses = await Promise.all(links.map(async (link) => {
        const { status } = await fetchAndCheckUrl(link);
        return { url: link, status };
      }));

      // Identify broken links
      const brokenLinks = linkStatuses.filter(({ status }) => 
        status === 400 || status === 404 || status === 410 || status === 502 || status === 408 || status === 503
      );

      // Identify redirects
      const redirectLinks = linkStatuses.filter(({ status }) => 
        status === 301 || status === 302
      );

      // Collect missing aria-label and alt text details
      const missingAriaLabels = ariaElements.filter(({ ariaLabel }) => !ariaLabel);
      const missingAltText = images.filter(({ alt }) => alt === 'No alt text');

      return {
        parentUrl,
        links: linkStatuses,
        brokenLinks,
        redirectLinks,
        missingAriaLabels,
        missingAltText,
        missingMetaTags,
        videos
      };
    } catch (error) {
      console.log(error)
      return { parentUrl, links: [{ url: 'Error fetching page', status: 'Error' }] };
    }
  }));

//   function getEmbedVideos(doc, parentUrl) {
//     const embedVideos= new Set();
//      doc.querySelectorAll('universal-media-player').forEach(umpElem => {
//         const optionsString = umpElem.getAttribute('options');
//             const options = JSON.parse(optionsString.replace(/&quot;/g, '"'));
//             const link = options.sources.find(source => source.quality === 'HQ').src; 
//             const modifiedlink = link.split('en-us')[0] + 'en-us';
//             const title = options.title;
//             embedVideos.add({ type:'video', src: modifiedlink,  parentUrl });
//     });
//     return Array.from(embedVideos);

// }

  res.json(results);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


