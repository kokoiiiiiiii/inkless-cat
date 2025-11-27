export const personal = {
  title: 'Personal Information',
  fields: {
    fullName: { label: 'Full Name', placeholder: 'John Doe' },
    title: { label: 'Headline', placeholder: 'Frontend Engineer / Product Tech Lead' },
    email: { label: 'Email', placeholder: 'you@example.com' },
    phone: { label: 'Phone', placeholder: '+1 555 123 4567' },
    location: { label: 'Location', placeholder: 'San Francisco / Remote' },
    summary: {
      label: 'Summary',
      placeholder: 'Use 2-3 sentences to highlight your value, results, and strengths.',
    },
  },
  photo: {
    show: 'Show Photo',
    size: 'Photo Size ({size}px)',
    position: 'Photo Placement',
    left: 'Left',
    right: 'Right',
    upload: 'Upload Photo',
    select: 'Choose Photo',
    remove: 'Remove Photo',
    hint: 'Recommended 400×400 JPG/PNG under 2MB.',
    alt: 'Photo of {name}',
    errors: {
      oversize: 'Image exceeds 2MB. Please choose a smaller file.',
      read: 'Failed to read the image. Try again or pick another file.',
    },
    tipsTitle: 'Photo Tips',
    tips: {
      tip1: 'Pick a front-facing photo with even lighting and a clean background.',
      tip2: 'Keep head and shoulders centered with breathing room to avoid odd crops.',
      tip3: 'Match outfits/background colors with the resume theme for cohesion.',
    },
  },
  extras: {
    title: 'Info',
    add: 'Add',
    empty: 'No custom info yet. Click “Add” to create your own labels and values.',
    label: { label: 'Label', placeholder: 'e.g. Personal Website' },
    value: { label: 'Value', placeholder: 'https://example.com' },
  },
} as const;
