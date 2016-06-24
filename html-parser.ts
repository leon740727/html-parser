/// <reference path="d/node.d.ts"/>
/// <reference path="d/es6-shim.d.ts"/>

import {Optional, Jsonable} from "./types";
import {flatten, first, intersection} from "./utils";
var parse5 = require("parse5");

type Attr = {name: string, value: string};

export class Token {
    tagName(): string {
        throw "not implement";
    }

    attr(name: string): Optional<string> {
        return Optional.empty();
    }

    classes(): Optional<string[]> {
        if (this.attr("class").is_present()) {
            return Optional.of(this.attr("class").get().split(/\s+/));
        } else {
            return Optional.empty();
        }
    }

    static selector(expression: string): (token: Token) => boolean {
        /** "div.hide.done" or ".hide" or "#job" or "div#job" ... */
        function eq<T>(s1: Set<T>, s2: Set<T>) {
            return s1.size == s2.size && Array.from(s1.values()).every(i => s2.has(i));
        }
        let _exp_tags = new Set(expression.match(/^\w+/) ? [expression.match(/^\w+/)[0]] : []);
        let _exp_classes = new Set(expression.match(/\.[\w\-]+/g) ? expression.match(/\.[\w\-]+/g).map(i => i.slice(1)) : []);
        let _exp_ids = new Set(expression.match(/#[\w\-]+/g) ? [expression.match(/#[\w\-]+/g).map(i => i.slice(1))[0]] : []);
        return (token: Token): boolean => {
            if (!(token instanceof StartTag)) {
                return false;
            } else {
                let _t_tags = new Set([token.tagName()]);
                let _t_classes = new Set(token.classes().is_present() ? token.classes().get() : []);
                let _t_ids = new Set(token.attr("id").is_present() ? [token.attr("id").get()] : []);
                return eq(intersection(_exp_tags, _t_tags), _exp_tags) &&
                       eq(intersection(_exp_classes, _t_classes), _exp_classes) &&
                       eq(intersection(_exp_ids, _t_ids), _exp_ids);
            }
        }
    }
}

export class StartTag extends Token {
    name: string;
    attrs: Attr[];
    selfClosing: boolean;
    constructor(name: string, attrs: Attr[], selfClosing: boolean) {
        super();
        this.name = name;
        this.attrs = attrs;
        this.selfClosing = selfClosing;
    }

    tagName(): string {
        return this.name;
    }

    attr(name: string): Optional<string> {
        return first(this.attrs.filter(i => i.name == name).map(i => i.value));
    }
}

export class EndTag extends Token {
    name: string;
    constructor(name: string) {
        super();
        this.name = name;
    }

    tagName(): string {
        return this.name;
    }
}

export class Text extends Token {
    text: string;
    constructor(text: string) {
        super();
        this.text = text;
    }

    tagName(): string {
        return "TEXT";
    }
}

export class TokenStream {
    tokens: Token[];
    pos: number;
    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.pos = 0;
    }

    static make(parser): Promise<TokenStream> {       // parser is parse5.SAXParser
        return new Promise<TokenStream>((resolve, reject) => {
            let tokens: Token[] = [];
            parser.on("startTag", (name: string, attrs: Attr[], selfClosing: boolean) => {
                tokens.push(new StartTag(name, attrs, selfClosing));
            });
            parser.on("endTag", (name: string) => {
                tokens.push(new EndTag(name));
            });
            parser.on("text", (text: string) => {
                tokens.push(new Text(text));
            });
            parser.on("finish", () => {
                resolve(new TokenStream(tokens));
            });
        });
    }

    isEmpty() {
        return this.pos >= this.tokens.length;
    }

    get(): Optional<Token> {
        if (this.isEmpty()) {
            return Optional.empty();
        } else {
            let p = this.pos;
            this.pos += 1;
            return Optional.of(this.tokens[p]);
        }
    }

    take(matcher: (token: Token) => boolean): Optional<Token> {
        while (!this.isEmpty()) {
            let i = this.get().get();
            if (matcher(i)) {
                return Optional.of(i);
            }
        }
        return Optional.empty();
    }
}

export class Node {
    tag: Token;
    children: Node[];
    constructor(tag: Token, children: Node[]) {
        this.tag = tag;
        this.children = children;
    }

    jsonable(): any {
        if (this.tag instanceof Text) {
            return (<Text>this.tag).text;
        } else if (this.tag instanceof StartTag) {
            let tag = <StartTag> this.tag;
            return {
                tag: tag.name,
                attrs: tag.attrs,
                children: this.children.map(i => i.jsonable())}
        }
    }

    elementChildren() {
        return this.children.filter(i => i.tag instanceof StartTag);
    }

    textChildren() {
        return this.children.filter(i => i.tag instanceof Text).map(i => (<Text>i.tag).text);
    }

    get innerText(): string {
        function nodeText(node: Node): string {
            if (node.tag instanceof Text) {
                return (<Text>node.tag).text;
            } else {
                return node.children.map(nodeText).join('');
            }
        }
        return nodeText(this);
    }

    find(matcher: (node: Node) => boolean): Node[] {
        if (matcher(this)) {
            return [this];
        } else {
            return flatten(this.children.map(i => i.find(matcher)));
        }
    }

    static make(token: Token, stream: TokenStream): Node {
        if (token instanceof StartTag) {
            if (token.selfClosing) {
                return new Node(token, []);
            } else {
                let node = new Node(token, []);
                while (!stream.isEmpty()) {
                    let next = stream.get().get();
                    if (next instanceof EndTag) {
                        return node;
                    } else {
                        node.children.push(Node.make(next, stream));
                    }
                }
                return node;
            }
        } else if (token instanceof Text) {
            return new Node(token, []);
        }
    }

    static selector(expression: string): (node: Node) => boolean {
        let tokenSelector = Token.selector(expression);
        return (node: Node): boolean => {
            return tokenSelector(node.tag);
        }
    }
}
