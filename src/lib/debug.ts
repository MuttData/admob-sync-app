import {Debugger} from 'electron';


type NodeIdOrSelector = number | string;


export class Debug {

    constructor (private debug: Debugger) {

    }

    getDocument () {
        return this.exec('DOM.getDocument', 'root');
    }

    async querySelector (selector: string, fromNodeId: number = null): Promise<number> {
        if (fromNodeId === null) {
            let {nodeId} = await this.getDocument();
            fromNodeId = nodeId;
        }
        return this.exec('DOM.querySelector', 'nodeId', {selector, nodeId: fromNodeId});
    }

    async querySelectorAll (selector: string, fromNodeId: number = null): Promise<Array<number>> {
        if (fromNodeId === null) {
            let {nodeId} = await this.getDocument();
            fromNodeId = nodeId;
        }
        return this.exec('DOM.querySelectorAll', 'nodeIds', {selector, nodeId: fromNodeId});
    }

    getNode (nodeId: number): Promise<{ value: any }> {
        return this.exec('DOM.resolveNode', 'object', {nodeId});
    }

    async getHTML (nodeIdOrSelector: NodeIdOrSelector) {
        let nodeId = await this.resolveNodeId(nodeIdOrSelector);
        let outer = await this.exec('DOM.getOuterHTML', 'outerHTML', {nodeId});
        return {
            outer,
            inner: />(?<inner>.*)<\//.exec(outer).groups.inner.trim()
        };
    }

    getInnerHTML (nodeIdOrSelector: NodeIdOrSelector): Promise<string> {
        return this.getHTML(nodeIdOrSelector).then(html => html.inner);
    }

    async focus (nodeId: number): Promise<void> {
        return this.exec('DOM.focus', null, {nodeId});
    }

    async enterText (text: string, nodeIdOrSelector: NodeIdOrSelector): Promise<void> {
        let inputNodeId = await this.resolveNodeId(nodeIdOrSelector);
        if (inputNodeId) {
            await this.focus(inputNodeId);
            if (nodeIdOrSelector !== inputNodeId) {
                await this.exec('Runtime.evaluate', null, {
                    expression: `document.querySelector('${nodeIdOrSelector}').select();`
                }).catch(() => {});
            }
            await text.split('')
                .reduce((promise, char) => {
                    return promise.then(() => this.enterSymbol(char));
                }, Promise.resolve());
        }
    }

    async enterSymbol (symbol: string): Promise<void> {
        let config = {
            nativeVirtualKeyCode: symbol.charCodeAt(0),
            unmodifiedText: symbol,
            text: symbol,
            modifiers: (symbol !== symbol.toLowerCase() || !/[^A-z0-9]/i.test(symbol)) ? 8 : 0
        };
        await this.exec('Input.dispatchKeyEvent', null, {...config, type: 'rawKeyDown'});
        await this.exec('Input.dispatchKeyEvent', null, {...config, type: 'char'});
        await this.exec('Input.dispatchKeyEvent', null, {...config, type: 'keyUp'});
    }

    async emulateEnter () {
        await this.enterSymbol('\r');
    }

    async click (nodeIdOrSelector: NodeIdOrSelector) {
        let nodeId = await this.resolveNodeId(nodeIdOrSelector),
            {cx, cy} = await this.getNodeRect(nodeId);
        await this.exec('Input.dispatchMouseEvent', null, {
            type: 'mousePressed',
            button: 'left',
            buttons: 1,
            x: cx,
            y: cy,
            clickCount: 1
        });
        await this.exec('Input.dispatchMouseEvent', null, {
            type: 'mouseReleased',
            button: 'left',
            buttons: 1,
            x: cx,
            y: cy,
            clickCount: 1
        });
    }

    async getNodeRect (nodeIdOrSelector: NodeIdOrSelector) {
        let nodeId = await this.resolveNodeId(nodeIdOrSelector);
        let [quads] = await this.exec<Array<Array<number>>>('DOM.getContentQuads', 'quads', {nodeId});
        let [x1, y1, x2, y2, , y3] = quads;
        return {
            x: x1,
            y: y1,
            width: x2 - x1,
            height: y3 - y2,
            top: y1,
            bottom: y3,
            left: x1,
            right: x2,
            cx: Math.round(x1 + (x2 - x1) / 2),
            cy: Math.round(y1 + (y3 - y2) / 2)
        };
    }

    exec<T = any> (method: string, property: string, args = {}): Promise<T> {
        return new Promise((resolve, reject) => {
            this.debug.sendCommand(method, args, (error, result) => {
                setImmediate(() => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(property ? result[property] : result);
                    }
                });
            });
        });
    }

    wait (time: number) {
        return new Promise(resolve => setTimeout(() => resolve(), time));
    }

    waitElement (selector: string, maxTime = 20000): Promise<number> {
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                clearTimeout(interval);
                reject(new Error(`Can't find element by selector '${selector}' during ${maxTime}ms`));
            }, maxTime);
            let check = () => {
                return setTimeout(async () => {
                    let nodeId = await this.querySelector(selector);
                    if (nodeId) {
                        clearTimeout(timeout);
                        setTimeout(() => resolve(nodeId), 500);
                    } else {
                        interval = check();
                    }
                }, 500);
            };
            let interval = check();
        });

    }

    waitElementVisible (selector: string, maxTime = 20000) {
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                clearTimeout(interval);
                reject(new Error(`Can't find element by selector '${selector}' during ${maxTime}ms`));
            }, maxTime);
            let check = () => {
                return setTimeout(async () => {
                    let nodeId = await this.querySelector(selector),
                        rect = await this.getNodeRect(nodeId).catch(() => null);
                    if (nodeId && rect) {
                        clearTimeout(timeout);
                        setTimeout(() => resolve(nodeId), 500);
                    } else {
                        interval = check();
                    }
                }, 500);
            };
            let interval = check();
        });
    }

    isElementExistsAndVisible (selector: string, maxTime?: number): Promise<boolean> {
        return this.waitElementVisible(selector, maxTime)
            .then(() => true)
            .catch(() => false)
    }

    async scrollIntoView (selector: string) {
        await this.exec('Runtime.evaluate', null, {
            expression: `document.querySelector('${selector}').scrollIntoView()`
        }).catch(() => {});
        await this.wait(300);
    }

    getCurrentUrl () {
        return this.exec('Runtime.evaluate', 'result', {
            expression: `location.href;`
        })
            .then(result => result.value)
            .catch(() => '');
    }

    async navigate (url: string) {
        return this.exec('Page.navigate', null, {url});
    }

    private async resolveNodeId (nodeIdOrSelector: NodeIdOrSelector): Promise<number> {
        if (typeof nodeIdOrSelector === 'number') {
            return nodeIdOrSelector;
        }
        return this.querySelector(nodeIdOrSelector);
    }

}