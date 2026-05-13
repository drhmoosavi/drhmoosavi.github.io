document.addEventListener('DOMContentLoaded', () => {
    const rightCol = document.querySelector('.right-col');
    const leftCol  = document.querySelector('.left-col');
    let open = false;

    rightCol.addEventListener('click', () => {
        // calculate shift as 90% of left column's width,
        // leaving 10% padding from the left edge of the container
        const shift = leftCol.getBoundingClientRect().width * 0.9;

        if (!open) {
            // slide right panel left over the left panel
            gsap.to(rightCol, {
                duration: 0.86,
                ease: 'power2.inOut',
                x: -shift,
                delay: 0.1 // waits 0.2 seconds before starting the animation
            });
        } else {
            // slide it back to its original position
            gsap.to(rightCol, {
                duration: 0.89,
                ease: 'power2.inOut',
                x: 0,
                delay: 0.1
            });
        }
        open = !open;
    });

  // Register ScrollTrigger plugin for rotator effect
  gsap.registerPlugin(ScrollTrigger);

  // Set initial states for spans in right-col list items
  gsap.set(".right-col li > span", {
    transformOrigin: "0 50%"
  });
  gsap.set(".right-col li:not(:first-of-type) > span", {
    opacity: 0.2,
    scale: 0.8
  });

  // Build timeline for right-col rotator effect
  const rightColTimeline = gsap.timeline()
    .to(".right-col li:not(:first-of-type) > span", {
      opacity: 1,
      scale: 1,
      stagger: 0.5
    })
    .to(".right-col li:not(:last-of-type) > span", {
      opacity: 0.2,
      scale: 0.8,
      stagger: 0.5
    }, 0);

  // Create ScrollTrigger to drive the animation on scroll
  ScrollTrigger.create({
    trigger: ".right-col",
    start: "center center",
    endTrigger: ".right-col li:last-of-type",
    end: "center center",
    pin: true,
    scrub: true,
    markers: true, // remove or set to false in production
    animation: rightColTimeline
  });
});