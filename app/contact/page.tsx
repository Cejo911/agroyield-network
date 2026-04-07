import type { Metadata } from 'next'
import ContactClient from './contact-client'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with AgroYield Network. For partnerships, press, investment inquiries, or general questions — our inbox is open.',
  openGraph: {
    title: 'Contact AgroYield Network',
    description: 'For partnerships, press, investment, or general enquiries — reach out directly or use our contact form.',
    url: 'https://agroyield.africa/contact',
  },
  twitter: {
    title: 'Contact AgroYield Network',
    description: 'For partnerships, press, investment, or general enquiries — our inbox is open.',
  },
}

export default function Contact() {
  return <ContactClient />
}
