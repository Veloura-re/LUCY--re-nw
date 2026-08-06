import { animate, stagger } from 'animejs';

/**
 * Run 60fps staggered reveal for lists, cards, or grid elements
 */
export function animateStaggeredReveal(
    selector: string | HTMLElement[],
    options?: {
        delay?: number;
        duration?: number;
        translateY?: [number, number];
        staggerTime?: number;
        easing?: string;
    }
) {
    const {
        delay = 100,
        duration = 800,
        translateY = [35, 0],
        staggerTime = 80,
        easing = 'cubicBezier(0.16, 1, 0.3, 1)'
    } = options || {};

    return animate(selector, {
        translateY,
        opacity: [0, 1],
        scale: [0.96, 1],
        delay: stagger(staggerTime, { start: delay }),
        duration,
        easing
    });
}

/**
 * Animate numbers or stats counter smoothly from start to target value
 */
export function animateCounter(
    element: HTMLElement,
    targetValue: number,
    duration: number = 1800,
    formatter?: (val: number) => string
) {
    const state = { count: 0 };

    return animate(state, {
        count: targetValue,
        round: 1,
        duration,
        easing: 'easeOutExpo',
        onUpdate: () => {
            if (element) {
                element.textContent = formatter ? formatter(state.count) : state.count.toLocaleString();
            }
        }
    });
}

/**
 * Attach magnetic hover elasticity to interactive elements
 */
export function attachMagneticHover(element: HTMLElement) {
    if (!element) return () => {};

    const onEnter = () => {
        animate(element, {
            scale: 1.04,
            translateY: -3,
            duration: 400,
            easing: 'easeOutCubic'
        });
    };

    const onLeave = () => {
        animate(element, {
            scale: 1,
            translateY: 0,
            duration: 400,
            easing: 'easeOutCubic'
        });
    };

    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);

    return () => {
        element.removeEventListener('mouseenter', onEnter);
        element.removeEventListener('mouseleave', onLeave);
    };
}
