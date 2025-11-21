import {createIcons, icons} from "lucide";

createIcons({icons});


/**
 * This observer is required since laravel injects 'raw' HTML at runtime for user-searchable lists (e.g. the search bar
 * at the top of the page). Since this inserts 'raw' HTML, elements like: <i data-lucide="..."> are included. This is an
 * issue, since they aren't rendered into their correct SVG representations. Therefore, we MUST check the DOM for any
 * updates and re-initialize the icons! This happens only when the DOM is actively changed (i.e. by searching for example).
 */
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const el: HTMLElement | null = mutation.target instanceof HTMLElement ? mutation.target : mutation.target.parentElement;

        if (mutation.type == "childList" && el?.querySelector('i[data-lucide]') !== null) {
            console.log(`${new Date().toISOString()} :: Updating Icons due to DOM change`);
            createIcons({icons});
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});