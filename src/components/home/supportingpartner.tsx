export function SupportingPartner() {
  return (
    <section
      aria-labelledby="supporting-partners-title"
      className="bg-background py-10 md:py-12"
    >
      <div className="layout-container flex flex-col items-center">
        <h2
          id="supporting-partners-title"
          className="font-eyebrow font-eyebrow-display text-center"
        >
          Supporting Partners
        </h2>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 md:gap-10">

          <a
            href="https://monal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Monal Cloud"
            className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src="/assets/monal.svg"
              alt="Monal"
              className="h-16 w-auto object-contain opacity-100 grayscale-0 transition-[filter,opacity] duration-200 md:h-20 md:opacity-70 md:grayscale md:group-hover:opacity-100 md:group-hover:grayscale-0 md:group-focus-visible:opacity-100 md:group-focus-visible:grayscale-0"
            />
          </a>

          <a
            href="https://letsbuildnepal.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Let's Build Nepal"
            className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src="/assets/lbn.png"
              alt="Let's Build Nepal"
              className="h-12 w-auto object-contain opacity-100 grayscale-0 transition-[filter,opacity] duration-200 md:h-14 md:opacity-70 md:grayscale md:group-hover:opacity-100 md:group-hover:grayscale-0 md:group-focus-visible:opacity-100 md:group-focus-visible:grayscale-0"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
