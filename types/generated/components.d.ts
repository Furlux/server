import type { Schema, Struct } from '@strapi/strapi';

export interface PageCollectionPreview extends Struct.ComponentSchema {
  collectionName: 'components_page_collection_previews';
  info: {
    description: 'Shows a preview of products from a specific category with optional filters';
    displayName: 'Collection Preview';
  };
  attributes: {
    category: Schema.Attribute.Relation<'oneToOne', 'api::category.category'>;
    filtersPreset: Schema.Attribute.JSON;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageCta extends Struct.ComponentSchema {
  collectionName: 'components_page_ctas';
  info: {
    description: 'Call-to-action block';
    displayName: 'Cta';
  };
  attributes: {
    buttonLink: Schema.Attribute.String;
    buttonText: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageFaq extends Struct.ComponentSchema {
  collectionName: 'components_page_faqs';
  info: {
    description: 'Frequently Asked Questions block';
    displayName: 'Faq';
  };
  attributes: {
    answer: Schema.Attribute.Blocks;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHero extends Struct.ComponentSchema {
  collectionName: 'components_page_heroes';
  info: {
    description: 'Hero section for dynamic pages';
    displayName: 'Hero';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageImageBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_image_blocks';
  info: {
    description: 'Image content block';
    displayName: 'Image Block';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface PageTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_text_blocks';
  info: {
    description: 'Rich text content block';
    displayName: 'Text Block';
  };
  attributes: {
    content: Schema.Attribute.Blocks;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'page.collection-preview': PageCollectionPreview;
      'page.cta': PageCta;
      'page.faq': PageFaq;
      'page.hero': PageHero;
      'page.image-block': PageImageBlock;
      'page.text-block': PageTextBlock;
    }
  }
}
