document.addEventListener('DOMContentLoaded', () => {
    const rightCol = document.querySelector('.right-col');
    const leftCol  = document.querySelector('.left-col');
    let open = false;
    // Guidance overlay when right-col is closed
    const guide = document.createElement('div');
    const guideText = document.createElement('span');
    guideText.textContent = 'click anywhere to expand';
    guide.appendChild(guideText);
    Object.assign(guide.style, {
        position: 'absolute',
        left: '13rem',
        top: '50%',
        transform: 'translate(-100%, -50%) rotate(90deg)',
        transformOrigin: 'left top',
        fontSize: '25px',
        color: 'white',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        zIndex: '30',
        display: open ? 'none' : 'block',
        lineHeight: '1',
        padding: '0'
    });
    rightCol.style.position = 'relative';
    rightCol.style.cursor = open ? 'default' : 'pointer';
    rightCol.appendChild(guide);
    // Ensure guide receives pointer events and shows pointer cursor
    guide.style.pointerEvents = 'auto';
    guide.style.cursor = 'pointer';
    // Hover effect on guidance overlay
    guideText.addEventListener('mouseenter', () => {
        guideText.classList.add('animate__animated', 'animate__headShake');
    });
    guideText.addEventListener('mouseleave', () => {
        guideText.classList.remove('animate__animated', 'animate__headShake');
    });
    guideText.addEventListener('animationend', () => {
        guideText.classList.remove('animate__animated', 'animate__headShake');
    });
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 5; // pixels

    rightCol.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = false; // reset on new click
    });

    rightCol.addEventListener('mousemove', (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > DRAG_THRESHOLD) {
            isDragging = true;
        }
    });

    rightCol.addEventListener('click', (e) => {
        // Don't trigger if the target is a list element
        if (e.target.closest('li') || e.target.closest('ul')) {
            return;
        }

        // Don't trigger if it was a drag
        if (isDragging) {
            return;
        }

        // Calculate shift as before
        const shift = leftCol.getBoundingClientRect().width * 0.80;

        if (!open) {
            // Hide guidance immediately when opening
            guide.style.display = 'none';
            rightCol.style.cursor = 'default';

            gsap.to(rightCol, {
                duration: 0.75,
                ease: 'power2.inOut',
                x: -shift,
                width: '80vw',
                delay: 0.05,
            });
            gsap.to(leftCol, {
                duration: 0.86,
                ease: 'power2.inOut',
                width: '20vw',
                delay: 0.1,
            });
        } else {
            gsap.to(rightCol, {
                duration: 0.89,
                ease: 'power2.inOut',
                x: 0,
                width: '20vw',
                delay: 0.1,
                onComplete: () => {
                    guide.style.display = 'block';
                    rightCol.style.cursor = 'pointer';
                },
            });
            gsap.to(leftCol, {
                duration: 0.86,
                ease: 'power2.inOut',
                width: '80vw',
                delay: 0.1,
            });
        }
        open = !open;
    });
});
