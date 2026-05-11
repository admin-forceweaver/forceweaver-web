---
title: "Spring’ 20 Feature – Upgrades to Change Set"
date: 2020-03-09
categories: 
  - "concepts"
tags: 
  - "changeset-components"
  - "communitytemplatedefinition"
  - "communitythemedefinition"
  - "email-service"
  - "lightning-community-template"
  - "lightning-community-theme"
  - "managedcontenttype"
  - "salesforce"
  - "whitelisted-url-for-redirects"
coverImage: "spring20changesetfeature.png"
---

Changesets are salesforce’s native way of transferring customization/configuration from one org to another. Change sets can contain only modifications you can make through the Setup menu- which are supported by the metadata. You can’t deploy data (For e, g: List of contacts). Change sets contain information about the org. They don’t contain data, such as records.

#### Faster availability of uploaded changeset

In salesforce the changeset that we create from the source sandboxes are called the outbound changeset and the target org that receives the changesets are called inbound changeset. During many times there have been issues with the upload and receive of the changeset as it takes considerable time to see the uploaded changeset in your target org. With the onset of Spring ’20 salesforce has optimized the way changesets are uploaded and received. Now, uploaded change sets are available for deployment sooner. Salesforce has not provided any metrics for this improvement. So, lets see how this make a difference. Please do comment if you have noticed improvements.

#### New Metadata for changeset

Following are the new components that are available from Spring '20 release that can be included in the changeset. All these are also available to use with ANT based or sfdx mdapi commands.

| **Component Name** | **Metadata API** **Name** | **Wildcard Support** |
| --- | --- | --- |
| Email Service | EmailServicesFunction | No |
| Lightning Community Template | CommunityTemplateDefinition | YES |
| Lightning Community Theme | CommunityThemeDefinition | YES |
| Lightning Message Channel | LightningMessageChannel  | YES |
| Managed Content Type | ManagedContentType | YES |
| Whitelisted URL for Redirects | RedirectWhitelistUrl | YES |

#### Conclusion

As most of the project are moving away from changeset and with the reception of ANT and sfdx, let’s wait and see how often we see improvements to the changeset way of deployment.
