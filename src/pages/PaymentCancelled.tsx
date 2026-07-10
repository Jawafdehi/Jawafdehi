import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CircleX, HeartHandshake, Headphones } from "lucide-react";

import { Button } from "@/components/ui/button";

const PAYPAL_DONATE_URL =
  "https://www.paypal.com/donate/?hosted_button_id=ZYCQYYBFK7SDY";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Payment cancelled — Jawafdehi</title>
        <meta
          name="description"
          content="Your Jawafdehi donation payment was cancelled. No payment was processed and you were not charged."
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://jawafdehi.org/donate/cancel" />
      </Helmet>

      <div className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden">
        <section className="container relative z-10 mx-auto flex min-h-[calc(100svh-76px)] flex-col items-center px-4 pb-6 pt-10 md:justify-center md:py-24">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center text-center md:flex-none">
            <CircleX
              className="mb-6 h-14 w-14 text-accent md:mb-8 md:h-20 md:w-20"
              strokeWidth={1}
              aria-hidden="true"
            />

            <h1 className="text-2xl font-extrabold leading-tight text-primary md:text-3xl">
              Payment cancelled
            </h1>

            <p className="mt-4 max-w-[21rem] text-sm leading-7 text-muted-foreground sm:max-w-md md:mt-5 md:max-w-2xl md:text-lg md:leading-8">
              This payment was cancelled and did not go through.
              {" "}
              No payment has been processed, and you were not charged.
            </p>

            <div className="mt-7 flex w-full max-w-[23rem] flex-row items-center justify-center gap-2.5 sm:max-w-md sm:gap-3 md:mt-10 md:max-w-xl md:gap-4">
              <Button
                asChild
                size="lg"
                className="font-button h-11 min-w-0 flex-1 rounded-full bg-accent px-2.5 text-accent-foreground shadow-md shadow-accent/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent/90 md:h-12 md:min-w-[15rem] md:px-7"
              >
                <a
                  href={PAYPAL_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HeartHandshake className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  Try donating again
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="font-button h-11 min-w-0 flex-1 rounded-full border-primary bg-background/80 px-2.5 text-primary hover:border-primary hover:bg-muted/60 hover:text-primary md:h-12 md:min-w-[13rem] md:px-7"
              >
                <Link to="/">Return home</Link>
              </Button>
            </div>
          </div>

          <p className="mb-3 mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary md:mb-0 md:mt-9">
            <Headphones className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>Need help?</span>
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
