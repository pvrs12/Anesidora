(() => {
    let host = null;

    if ('chrome' in window) {
        host = window.chrome;
    } else if ('browser' in window) {
        host = window.browser
    } else {
        console.error('Could not find browser reference');
        return;
    }

    let background = host.extension.getBackgroundPage();
    let rootPath = host.extension.getURL('');
    background.collectedErrors ??= [];
    window.addEventListener('error', (e) => {
        let message = `${e.filename.replace(rootPath, '')}:${e.lineno}:${e.colno} | ${e.message}`;
        let existingIndex = background.collectedErrors.find(e => e === message);
        if (existingIndex === -1) {
            background.collectedErrors.push(message);
        }
    })
    window.addEventListener('unhandledrejection', (e) => {
        let message = `Unhandled rejection in ${window.location.href.replace(rootPath, '')} | ${e.reason}`;
        let existingIndex = background.collectedErrors.find(e => e === message);
        if (existingIndex === -1) {
            background.collectedErrors.push(message);
        }
    });
})();