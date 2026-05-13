document.addEventListener('DOMContentLoaded', () => {
    // 1) Inject CSS: neutral link color + title/journal styling
    const style = document.createElement('style');
    document.head.appendChild(style);
  
    // 2) Month number → three‑letter name
    const numToMon = {
      '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr',
      '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Aug',
      '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };
  
    // —— ORCID fetch (Vancouver style, 4‑author limit + et al.) ——
    async function fetchORCIDPublications(orcidID) {
      const headers = { 'Accept': 'application/vnd.orcid+json' };
      const list = document.getElementById('orcid-publications');
      if (!list) return;
  
      try {
        // Use the /record endpoint to ensure we get the works summary
        const resp = await fetch(`https://pub.orcid.org/v3.0/${orcidID}/record`, { headers });
        if (!resp.ok) throw new Error(`ORCID status ${resp.status}`);
        const data = await resp.json();
        const group = data['activities-summary']?.works?.group || [];
        if (!group.length) throw new Error('No public works found');
  
        // sort newest → oldest
        group.sort((a, b) => {
          const yA = +a['work-summary'][0]?.['publication-date']?.year?.value || 0;
          const yB = +b['work-summary'][0]?.['publication-date']?.year?.value || 0;
          return yB - yA;
        });
  
        list.innerHTML = '';
        for (const g of group) {
          const s           = g['work-summary'][0];
          const title       = s.title?.title?.value       || 'No title';
          const fullJournal = s['journal-title']?.value   || 'Unknown journal';
  
          // DOI if present
          const doiObj   = (s['external-ids']?.['external-id'] || [])
                             .find(x => x['external-id-type'] === 'doi');
          const doiValue = doiObj?.['external-id-value'];
          const doiLink  = doiValue && `https://doi.org/${doiValue}`;
  
          // get ISO‑abbr title via Crossref
          let journalAbbrev = fullJournal;
          if (doiValue) {
            try {
              const cr = await fetch(`https://api.crossref.org/works/${doiValue}`);
              if (cr.ok) {
                const msg = (await cr.json()).message;
                journalAbbrev = msg['short-container-title']?.[0]
                              || msg['container-title']?.[0]
                              || fullJournal;
              }
            } catch {
              // ignore Crossref errors
            }
          }
  
          // date → "Mon YYYY"
          const pd    = s['publication-date'] || {};
          const mRaw  = pd.month?.value;
          const yyyy = pd.year?.value || '';
          const mName = numToMon[String(parseInt(mRaw,10))] || '';
          const date = mName && yyyy ? `${mName} ${yyyy}` : (yyyy || '');
  
          // fetch full contributors for author list
          const detail = await (await fetch(
            `https://pub.orcid.org/v3.0/${orcidID}/work/${s.putCode}`, { headers }
          )).json();
          const contr = detail.contributors?.contributor || [];
          const names = contr.slice(0,4)
                        .map(c => c['credit-name']?.value)
                        .filter(Boolean);
          if (contr.length > 4) names.push('et al.');
          const authorStr = names.join(', ') || 'No authors';
  
          // build LI
          const cleanTitle = title.replace(/\.$/, '');
          const li = document.createElement('li');
          li.innerHTML = `
            <div>
              <em class="publication-journal">${journalAbbrev}</em> <span class="publication-date">${date}</span>
            </div>
            <div>
              ${doiLink
                ? `<a href="${doiLink}" target="_blank" rel="noopener noreferrer"><span class="publication-title">${cleanTitle}</span></a>`
                : `<span class="publication-title">${cleanTitle}</span>`}
            </div>
            <div class="authors">${authorStr}</div>
          `;
          list.appendChild(li);
        }
      } catch (err) {
        console.error(err);
        list.innerHTML = '<li>Error loading ORCID publications.</li>';
      }
    }
  
    // —— PubMed fetch (basic Vancouver style) ——
    async function fetchPubMedPublications(authorName) {
      const list = document.getElementById('pubmed-publications');
      if (!list) return;
      try {
        // 1) search for IDs
        const searchRes = await fetch(
          'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi'
          + '?db=pubmed'
          + `&term=${encodeURIComponent(authorName)}`
          + '&retmode=json&retmax=25'
        );
        const { esearchresult } = await searchRes.json();
        const ids = esearchresult.idlist;
        if (!ids.length) throw new Error('No PubMed IDs found');
  
        // 2) fetch details XML
        const fetchRes = await fetch(
          'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
          + `?db=pubmed&id=${ids.join(',')}`
          + '&retmode=xml'
        );
        const xmlText  = await fetchRes.text();
        const doc      = new DOMParser().parseFromString(xmlText, 'application/xml');
        const articles = Array.from(doc.getElementsByTagName('PubmedArticle'));
  
        // parse & sort by year desc
        const parsed = articles.map(a => {
          const titleEl = a.getElementsByTagName('ArticleTitle')[0];
          const title   = titleEl?.textContent || 'No title';
  
          // ISO‑abbr or fallback
          const isoEl   = a.getElementsByTagName('ISOAbbreviation')[0];
          const journal = isoEl?.textContent
                        || a.getElementsByTagName('Title')[0]?.textContent
                        || 'Unknown journal';
  
          // date → "Mon YYYY"
          const yearTxt = a.querySelector('PubDate > Year')?.textContent || '';
          const monRaw  = a.querySelector('PubDate > Month')?.textContent || '';
          // month can be name or number
          let mName = numToMon[String(parseInt(monRaw,10))];
          if (!mName && /^[A-Za-z]{3,}/.test(monRaw)) {
            mName = monRaw.slice(0,3);
          }
          const yyyyTxt = yearTxt;
          const date = mName && yyyyTxt ? `${mName} ${yyyyTxt}` : (yyyyTxt || '');
  
          // PMID link
          const pmid = a.getElementsByTagName('PMID')[0]?.textContent || '';
          const link = pmid
            ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
            : '#';
  
          // authors
          const authEls = Array.from(a.getElementsByTagName('Author'));
          const names   = authEls.slice(0,4)
                            .map(e => {
                              const last = e.getElementsByTagName('LastName')[0]?.textContent;
                              const init = e.getElementsByTagName('Initials')[0]?.textContent;
                              return (last && init) ? `${last} ${init}` : null;
                            })
                            .filter(Boolean);
          if (authEls.length > 4) names.push('et al.');
  
          return { title, journal, date, link, authors: names.join(', ') };
        }).sort((a,b) => (+b.date.slice(-2)) - (+a.date.slice(-2)));
  
        list.innerHTML = '';
        parsed.forEach(p => {
          const cleanTitle = p.title.replace(/\.$/, '');
          const li = document.createElement('li');
          li.innerHTML = `
            <div>
              <em class="publication-journal">${p.journal}</em>  |  <span class="publication-date">${p.date}</span>
            </div>
            <div>
              <a href="${p.link}" target="_blank" rel="noopener noreferrer"><span class="publication-title">${cleanTitle}</span></a>
            </div>
            <div class="authors">${p.authors}</div>
          `;
          list.appendChild(li);
        });
      } catch (err) {
        console.error(err);
        list.innerHTML = '<li>Error loading PubMed publications.</li>';
      }
    }
  
    // kick things off
    fetchORCIDPublications('0000-0002-0533-7476');
    fetchPubMedPublications("Moosavi SH[Author] AND Norway[AD]");
  });

  document.addEventListener('DOMContentLoaded', function() {
    const ul = document.getElementById('pubmed-publications');
    if (!ul) return;
    const delayIncrement = 0.25; // Additional delay per item
    const initialDelay = 1.4;      // First animation starts after 2 seconds
  
    // Optionally hide existing list items via inline style (or set this in your CSS)
    Array.from(ul.children).forEach(item => {
      item.style.opacity = 0;
    });
  
    // Function to (re)apply animation properties to all list items.
    function animateListItems() {
      const listItems = ul.querySelectorAll('li');
      listItems.forEach((item, index) => {
        // Ensure initial opacity is 0 so items are hidden until animated
        item.style.opacity = 0;
        // Set animation delay: first item starts after initialDelay seconds
        item.style.animationDelay = `${initialDelay + index * delayIncrement}s`;
        item.style.animationName = 'backInRight';
        item.style.animationDuration = '0.14s';
        // Use 'forwards' so the element stays in its post-animation state
        item.style.animationFillMode = 'forwards';
        item.style.animationTimingFunction = 'ease-in-out';
        item.style.backfaceVisibility = 'visible';
  
        // Trigger reflow to restart animation if needed.
        item.offsetWidth;
  
        // Listen for animation end: you can set opacity to 1 if the keyframes
        // don't already do so.
        item.addEventListener('animationend', function() {
          item.style.opacity = 1;
        });
      });
    }
  
    // Create a MutationObserver to watch for added list items.
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          animateListItems();
        }
      });
    });
  
    observer.observe(ul, { childList: true });
  
    // Initially run the function in case list items are already present.
    animateListItems();
  });