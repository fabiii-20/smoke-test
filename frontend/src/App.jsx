// src/App.jsx
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    setUrls(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/check-urls', { urls: urls.split('\n').map(url => url.trim()) });
      setResults(response.data);
    } catch (error) {
      console.error('Error checking URLs:', error);
    }
  };

  const renderVideo = (title, items) => (
    <div className="mb-4 border border-gray-300 rounded">
      <button
        type="button"
        className="w-full px-4 py-2 text-left bg-gray-100 border-b border-gray-300"
        onClick={() => document.getElementById(title).classList.toggle('hidden')}
      >
        {title}
      </button>
      <div id={title} className="hidden p-4">
        {/* {items?.} */}
        {items?.map(video => <div>
          Video: {" "}
          <a href={video.src}
          target='_blank'
           className='text-md font-semibold py-2'>{video.src}</a>
          <div>
          <button
            type="button"
            className="w-full px-4 py-1 text-left bg-gray-200 border-b border-gray-300"
            onClick={() => document.getElementById(title+'-ttml').classList.toggle('hidden')}
          >
        TTML Files
      </button>
            <ul id={`${title}-ttml`} className='pl-3'>
            {video?.ccFiles?.map(ccfile => <li className='pl-3'>{ccfile}</li>)}
            </ul>
            <button
            type="button"
            className="w-full px-4 py-1 text-left bg-gray-200 border-b border-gray-300"
            onClick={() => document.getElementById(title+'-txt').classList.toggle('hidden')}
          >
       Downloadable Files (TXT)
      </button>
            <ul id={`${title}-txt`}  className='pl-3'>
            {video?.downloadableFiles?.map(ccfile => <li className='pl-3'>{ccfile}</li>)}
            </ul>
          </div>
        </div>)}
        </div>
        </div>
  )


  const renderAccordion = (title, items, isLink = true, isImage = false) => (
    <div className="mb-4 border border-gray-300 rounded">
      <button
        type="button"
        className="w-full px-4 py-2 text-left bg-gray-100 border-b border-gray-300"
        onClick={() => document.getElementById(title).classList.toggle('hidden')}
      >
        {title}
      </button>
      <div id={title} className="hidden p-4">
        <ul>
          {items && items.length > 0 ? items.map((item, index) => (
            <li key={index} className="mb-2">
              {isImage ? (
                <div className="flex flex-wrap">
                <div className='flex items-center mb-4'>
                  <img src={item.src} alt={item.alt} className="w-24 h-auto mr-2" />
                  <span>Alt: {item.alt}</span>
                </div>
                </div>
              ) : isLink ? (
                item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                ) : (
                  'Invalid URL'
                )
              ) : (
                <span>{item}</span>
              )}: {item.status || ''}
            </li>
          )) : (
            <li>No {title.toLowerCase()} found.</li>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">POST LIVE QA</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={urls}
          onChange={handleChange}
          rows="10"
          cols="50"
          placeholder="Enter parent URLs, one per line"
          className="w-full p-2 border border-gray-300 rounded mb-4"
        ></textarea>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check URLs
        </button>
      </form>
      <div>
        {results.map((result, index) => (
          <div key={index} className="mb-6 p-4 border border-gray-300 rounded">
            <h3 className="text-xl font-semibold mb-2">
              Parent URL: <a href={result.parentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{result.parentUrl}</a>
            </h3>
            {renderAccordion('Links', result.links)}
            {renderAccordion('Broken Links', result.brokenLinks)}
            {renderAccordion('Redirect Links', result.redirectLinks)}
            {renderAccordion('Missing ARIA Labels', result.missingAriaLabels && result.missingAriaLabels.map(label => `${label.element} - Target: ${label.target}`), false)}
            {renderAccordion('Missing Alt Texts', result.missingAltText && result.missingAltText.map(img => ({ src: img.src, alt: img.alt })), false, true)}
            {renderAccordion('Missing Meta Tags', result.missingMetaTags && result.missingMetaTags.map(tag => `Meta tag: ${tag}`), false)}
            {/* {JSON.stringify(result.videos)} */}
            {renderVideo('Videos present',result.videos)}
            
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
