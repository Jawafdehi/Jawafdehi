import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Archive, HeartHandshake, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  return (
    <div className="bg-background">
      <Helmet>
        <title>Thank you for supporting Jawafdehi</title>
        <meta
          name="description"
          content="Thank you for supporting Jawafdehi. Your contribution helps keep Nepal's accountability archive free, open, and permanent."
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://jawafdehi.org/donate/success" />
      </Helmet>

      <div className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden">
        <PaymentSuccessBackground />

        <section className="container relative z-10 mx-auto flex min-h-[calc(100svh-76px)] flex-col items-center px-4 pb-4 pt-4 md:px-6 md:pb-8 md:pt-6">
          <div className="mx-auto flex w-full max-w-5xl flex-1 -translate-y-10 flex-col items-center justify-center text-center md:-translate-y-16">
            <HeartHandshake
              aria-hidden="true"
              className="mb-4 h-12 w-12 text-accent md:mb-5 md:h-16 md:w-16"
              strokeWidth={1.65}
            />

            <h1 className="max-w-4xl text-3xl font-black leading-[1.04] tracking-normal text-primary md:text-4xl lg:text-5xl">
              Thank you for
              <span className="block">supporting Jawafdehi.</span>
            </h1>

            <p className="mt-4 max-w-[24rem] text-base leading-7 text-foreground/75 md:mt-5 md:max-w-3xl md:text-xl md:leading-8">
              Your contribution helps keep Nepal&apos;s accountability archive free,
              open, and permanent.
            </p>

            <div className="mt-9 flex w-full max-w-[23rem] flex-row items-center justify-center gap-2.5 sm:max-w-md sm:gap-3 md:mt-12 md:max-w-xl md:gap-4">
              <Button
                asChild
                size="lg"
                className="h-11 min-w-0 flex-1 rounded-full bg-primary px-2.5 text-[0.8125rem] font-semibold text-primary-foreground shadow-md shadow-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 sm:text-sm md:h-12 md:min-w-[14rem] md:px-7"
              >
                <Link to="/search?type=case">
                  <Archive className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  Explore archive
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 min-w-0 flex-1 rounded-full border-primary bg-background/80 px-2.5 text-[0.8125rem] font-semibold text-primary hover:border-primary hover:bg-muted/60 hover:text-primary sm:text-sm md:h-12 md:min-w-[13rem] md:px-7"
              >
                <Link to="/">Return home</Link>
              </Button>
            </div>
          </div>

          <p className="mb-1 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary md:mb-0">
            <Mail className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>Need a receipt?</span>
            <a
              href="mailto:inquiry@jawafdehi.org"
              className="text-accent underline underline-offset-4 transition-colors hover:text-accent/80"
            >
              Contact us
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

function PaymentSuccessBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-background"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-[76%] -z-10 h-[320px] w-[560px] max-w-none -translate-x-1/2 opacity-[0.22] blur-[140px] dark:hidden sm:-top-44 sm:left-[74%] sm:h-[400px] sm:w-[680px] sm:opacity-[0.26] sm:blur-[150px] lg:-top-48 lg:left-[72%] lg:h-[500px] lg:w-[820px] lg:opacity-[0.3] lg:blur-[164px]"
      >
        <div className="absolute right-[4%] top-10 h-[66%] w-[54%] rounded-full bg-accent opacity-85" />
        <div className="absolute left-[32%] top-24 h-[52%] w-[42%] rounded-full bg-accent opacity-55" />
        <div className="absolute -left-[14%] top-[46%] h-[34%] w-[26%] rounded-full bg-primary opacity-35" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [background-image:radial-gradient(hsl(var(--foreground)/0.14)_0.75px,transparent_0.75px)] [background-size:18px_18px]"
      />

      <img
        aria-hidden="true"
        src="/assets/map-light.svg"
        alt=""
        className="pointer-events-none absolute left-1/2 top-[49%] -z-10 hidden h-[500px] w-[min(1280px,112vw)] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] object-contain opacity-[0.1] saturate-[1.1] contrast-[0.95] mix-blend-multiply md:block lg:h-[620px] lg:w-[min(1680px,118vw)] lg:opacity-[0.12] xl:h-[660px] xl:w-[min(1780px,120vw)] dark:opacity-[0.07] dark:mix-blend-screen"
      />
    </>
  );
}
