declare module "page-flip" {
  export interface PageFlipEvent {
    data: unknown;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>);
    destroy(): void;
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    turnToPage(page: number): void;
    flip(page: number, corner?: string): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): string;
    on(event: string, callback: (e: PageFlipEvent) => void): void;
  }
}
