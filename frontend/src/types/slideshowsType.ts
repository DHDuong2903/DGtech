export interface HeroSlideCTA {
  text: string;
  link: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  image: string;
  cta?: HeroSlideCTA;
}

export interface SlideshowCampaign {
  slideshowId: number;
  name: string;
  isActive: boolean;
  slides: HeroSlide[];
  createdAt?: string;
  updatedAt?: string;
}

export type SlideshowCampaignFormData = {
  name: string;
  slides: HeroSlide[];
  /** Create only: set as the storefront campaign (deactivates others) */
  activate?: boolean;
};
