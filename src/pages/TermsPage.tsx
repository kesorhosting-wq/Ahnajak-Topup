import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ShieldCheck, FileText, Lock, AlertTriangle, RefreshCw, Mail } from "lucide-react";
import Header from "@/components/Header";
import HeaderSpacer from "@/components/HeaderSpacer";
import { useSite } from "@/contexts/SiteContext";

interface Section {
  icon: React.ReactNode;
  title: string;
  titleKh: string;
  body: string;
  bodyKh: string;
}

const TermsPage: React.FC = () => {
  const { settings } = useSite();

  const termsSections: Section[] = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Acceptance of Terms",
      titleKh: "ការទទួលយកលក្ខខណ្ឌ",
      body: "By using our top-up service, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the service.",
      bodyKh: "ដោយប្រើប្រាស់សេវាបញ្ចូលទឹកប្រាក់របស់យើង អ្នកយល់ព្រមគោរពតាមលក្ខខណ្ឌទាំងនេះ។ បើអ្នកមិនយល់ព្រម សូមកុំប្រើប្រាស់សេវានេះ។",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Service Description",
      titleKh: "ការពិពណ៌នាសេវា",
      body: "We provide instant in-game top-up services for various games. All transactions are processed automatically once payment is verified.",
      bodyKh: "យើងផ្តល់សេវាបញ្ចូលទឹកប្រាក់ភ្លាមៗសម្រាប់ហ្គេមផ្សេងៗ។ រាល់ប្រតិបត្តិការត្រូវបានដំណើរការដោយស្វ័យប្រវត្តិបន្ទាប់ពីការទូទាត់ត្រូវបានបញ្ជាក់។",
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "User Responsibility",
      titleKh: "ការទទួលខុសត្រូវរបស់អ្នកប្រើប្រាស់",
      body: "You are responsible for providing the correct Game ID, Server ID, and other information. We are NOT responsible for top-ups sent to wrong accounts due to incorrect information provided by you.",
      bodyKh: "អ្នកមានកាតព្វកិច្ចផ្តល់ Game ID, Server ID និងព័ត៌មានផ្សេងៗឱ្យបានត្រឹមត្រូវ។ យើងមិនទទួលខុសត្រូវចំពោះការបញ្ចូលទឹកប្រាក់ខុស ដោយសារអ្នកផ្តល់ព័ត៌មានមិនត្រឹមត្រូវនោះទេ។",
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Refund Policy",
      titleKh: "គោលការណ៍សងប្រាក់វិញ",
      body: "Once a top-up is successfully delivered to your account, no refunds will be issued. If a payment was made but no top-up was delivered, please contact our support team within 24 hours.",
      bodyKh: "នៅពេលការបញ្ចូលទឹកប្រាក់ត្រូវបានដឹកជញ្ជូនដោយជោគជ័យ យើងនឹងមិនធ្វើការសងប្រាក់វិញឡើយ។ ប្រសិនបើបានបង់ប្រាក់ហើយ ប៉ុន្តែមិនបានទទួល សូមទាក់ទងក្រុមជំនួយរបស់យើងក្នុងរយៈពេល 24 ម៉ោង។",
    },
  ];

  const privacySections: Section[] = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Information We Collect",
      titleKh: "ព័ត៌មានដែលយើងប្រមូល",
      body: "We collect your Game ID, Server ID, payment information, and contact details necessary to process your top-up orders. We do NOT collect your game account password.",
      bodyKh: "យើងប្រមូល Game ID, Server ID, ព័ត៌មានទូទាត់ និងព័ត៌មានទំនាក់ទំនងចាំបាច់ដើម្បីដំណើរការការបញ្ជាទិញរបស់អ្នក។ យើងមិនប្រមូលលេខសម្ងាត់គណនីហ្គេមរបស់អ្នកទេ។",
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "How We Use Your Data",
      titleKh: "របៀបយើងប្រើប្រាស់ទិន្នន័យ",
      body: "Your information is used solely to process orders, verify payments, and provide customer support. We do not sell or share your personal data with third parties.",
      bodyKh: "ព័ត៌មានរបស់អ្នកត្រូវបានប្រើប្រាស់សម្រាប់តែការដំណើរការការបញ្ជាទិញ ការបញ្ជាក់ការទូទាត់ និងផ្តល់ការគាំទ្រ។ យើងមិនលក់ ឬចែករំលែកទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកជាមួយភាគីទីបីទេ។",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Data Security",
      titleKh: "សុវត្ថិភាពទិន្នន័យ",
      body: "We use industry-standard encryption and secure payment gateways to protect your information. All transactions are processed over secure HTTPS connections.",
      bodyKh: "យើងប្រើការអ៊ិនគ្រីបតាមស្តង់ដារឧស្សាហកម្ម និងច្រកទូទាត់ប្រាក់សុវត្ថិភាពដើម្បីការពារព័ត៌មានរបស់អ្នក។ រាល់ប្រតិបត្តិការត្រូវបានដំណើរការតាមរយៈការតភ្ជាប់ HTTPS សុវត្ថិភាព។",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Contact Us",
      titleKh: "ទាក់ទងយើង",
      body: "If you have any questions about our Terms or Privacy Policy, please contact us through the contact button on our website.",
      bodyKh: "ប្រសិនបើអ្នកមានសំណួរអំពីលក្ខខណ្ឌ ឬគោលការណ៍ឯកជនភាព សូមទាក់ទងយើងតាមរយៈប៊ូតុងទំនាក់ទំនងនៅលើគេហទំព័ររបស់យើង។",
    },
  ];

  const renderSection = (section: Section, index: number) => (
    <div
      key={index}
      className="group relative p-5 sm:p-6 rounded-2xl bg-white/70 border border-white/60 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold to-amber-500 text-black flex items-center justify-center shadow-md ring-2 ring-white/60">
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-0.5">{section.title}</h3>
          <p className="font-khmer text-xs sm:text-sm text-muted-foreground mb-2">{section.titleKh}</p>
          <p className="text-sm sm:text-[15px] leading-relaxed text-foreground/85 mb-2">{section.body}</p>
          <p className="font-khmer text-xs sm:text-sm leading-relaxed text-muted-foreground">{section.bodyKh}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Terms & Privacy - {settings.siteName}</title>
        <meta name="description" content={`Terms & Conditions and Privacy Policy for ${settings.siteName}.`} />
      </Helmet>

      <div className="min-h-screen pb-12">
        <Header />
        <HeaderSpacer />

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl">
          {/* Back */}
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors animate-fade-in-up"
          >
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-sm flex items-center justify-center group-hover:bg-white group-hover:-translate-x-0.5 transition-all">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span>ត្រលប់ក្រោយ</span>
          </Link>

          {/* Hero */}
          <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-white/20 animate-fade-in-up">
            <div className="pointer-events-none absolute -inset-[1px] rounded-[28px] bg-[linear-gradient(120deg,hsl(43_74%_49%/.6),transparent_30%,transparent_70%,hsl(43_74%_49%/.6))] bg-[length:200%_100%] animate-gradient-shift opacity-70" />
            <div className="relative bg-gradient-to-br from-amber-900 via-stone-900 to-black p-6 sm:p-10">
              <div className="absolute top-6 right-6 w-32 h-32 rounded-full bg-gold/30 blur-3xl animate-float-slow" />
              <div className="absolute bottom-4 left-10 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl animate-float-slow" style={{ animationDelay: '1.5s' }} />

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white text-[10px] sm:text-xs font-semibold mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Legal Information
                </div>
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white mb-1 drop-shadow-lg">
                  Terms & Privacy
                </h1>
                <p className="font-khmer text-sm sm:text-base text-white/80">
                  លក្ខខណ្ឌ និង គោលការណ៍ឯកជនភាព
                </p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <section id="terms" className="mb-8 sm:mb-10 scroll-mt-24">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-gold to-amber-500 text-black flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg ring-2 ring-white/70">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">Terms & Conditions</h2>
                <p className="font-khmer text-xs sm:text-sm text-muted-foreground">លក្ខខណ្ឌប្រើប្រាស់</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {termsSections.map(renderSection)}
            </div>
          </section>

          {/* Privacy */}
          <section id="privacy" className="scroll-mt-24">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
              <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg ring-2 ring-white/70">
                <Lock className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">Privacy Policy</h2>
                <p className="font-khmer text-xs sm:text-sm text-muted-foreground">គោលការណ៍ឯកជនភាព</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {privacySections.map(renderSection)}
            </div>
          </section>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs sm:text-sm text-muted-foreground animate-fade-in-up">
            <p className="font-khmer">បានធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage;
