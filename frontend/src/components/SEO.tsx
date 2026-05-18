import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description }) => {
  useEffect(() => {
    // Update Document Title
    document.title = `${title} | FlowSync`;

    // Update Meta Author
    let metaAuthor = document.querySelector('meta[name="author"]');
    if (!metaAuthor) {
      metaAuthor = document.createElement('meta');
      metaAuthor.setAttribute('name', 'author');
      document.head.appendChild(metaAuthor);
    }
    metaAuthor.setAttribute('content', 'Neody IT');

    // Update Meta Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    
    const defaultDesc = "FlowSync - The premium departmental synchronization and task management system designed to orchestrate academic workflows.";
    let finalDesc = description || defaultDesc;
    
    // Ensure "Created and Managed by Neody IT" is present in the description
    if (!finalDesc.includes("Created and Managed by Neody IT")) {
      if (!finalDesc.endsWith('.')) {
        finalDesc += '.';
      }
      finalDesc += " Created and Managed by Neody IT.";
    }
    
    metaDescription.setAttribute('content', finalDesc);

    // Update OpenGraph Description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', finalDesc);

    // Update OpenGraph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', `${title} | FlowSync`);

  }, [title, description]);

  return null;
};

export default SEO;
