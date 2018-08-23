# ©2018 salesforce.com, inc. All rights reserved.
#!/bin/bash

if [ ! -d EndlessAisle ]
then
    echo "You must run this in the same directory as the EndlessAisle"
    echo "export files (Instore-Service-Ext/int_ocapi_ext_core/config)."
exit
fi

sedScript=""
echo ""
echo "This script creates two Site Import zip files for setup of Endless Aisle "
echo "on a single site."

site_name=${1}
is_custom_object_site=${2}

if [ -z ${site_name} ];
then
    echo ""
    echo "Enter the site name for Endless Aisle "
    read -p "(default: SiteGenesis): " site_name
    site="SiteGenesis"
fi

if [ -z ${is_custom_object_site} ]
then
    echo ""
    echo "Use site custom objects to enhance site customization options? (Y or N)"
    echo "Note: Selecting yes requires you to update store passwords for each site"
    echo "using Endless Aisle."
    read -p "(default: N (organization) ): " is_custom_object_site
    echo ${is_custom_object_site}
fi


if [[ -z ${is_custom_object_site} || "${is_custom_object_site}" = "N" || "${is_custom_object_site}" = "n" ]];
then
    custom_object="organization"
elif [[ "${is_custom_object_site}" = "Y" || "${is_custom_object_site}" = "y" ]];
then
    custom_object="site"
else
    echo "Please enter Y or N as an input"
    exit
fi

if [ ! -z ${site_name} ]
then
    site=${site_name}
    echo ""
    echo "Updating site name to '${site}'"
    sedScript="s/SiteGenesis/${site}/g"
fi

cp -R EndlessAisle EndlessAisle_${custom_object}_${site}
cp -R EndlessAisleSampleData EndlessAisleSampleData_${custom_object}_${site}
if [ ${custom_object} = "site" ]
then
    cd EndlessAisle_${custom_object}_${site}/meta
    echo "Renaming custom objects scope to '${custom_object}'"
    file_name="custom-objecttype-definitions.xml"
    pattern="s/organization/${custom_object}/g"
    sed -i .orig ${pattern} ${file_name}
    rm ${file_name}.orig
    cd ../..
    cd EndlessAisleSampleData_${custom_object}_${site}
    mkdir -p -- sites/SiteGenesis
    cd sites/SiteGenesis
    cp -R ../../custom-objects .
    cd ../../..
    rm -rf EndlessAisleSampleData_${custom_object}_${site}/custom-objects
    cd EndlessAisleSampleData_${custom_object}_${site}/sites
    if [ ! -z ${site_name} ]
    then
        echo "Renaming sample data SiteGenesis to '${site}'"
        mv SiteGenesis ${site}
    fi
    cd ../..
fi

if [ ! -z ${sedScript} ]
then
    for file in $(find EndlessAisle_${custom_object}_${site} -type f)
    do
        sed -i .orig ${sedScript} ${file}
        rm ${file}.orig
    done
fi

if [ ! -z ${site_name} ]
then
    echo "Renaming SiteGenesis to '${site}'"
    cd EndlessAisle_${custom_object}_${site}/sites
    mv SiteGenesis ${site}
    cd ../..
fi


echo ""
echo "Creating EndlessAisle_${custom_object}_${site}.zip file"
rm -rf EndlessAisle_${custom_object}_${site}.zip
zip -r EndlessAisle_${custom_object}_${site}.zip EndlessAisle_${custom_object}_${site}

echo ""
echo "Creating EndlessAisleSampleData_${custom_object}_${site}.zip file"
rm -rf EndlessAisleSampleData_${custom_object}_${site}.zip
zip -r EndlessAisleSampleData_${custom_object}_${site}.zip EndlessAisleSampleData_${custom_object}_${site}

echo ""
echo "Deleting temporary folders"
rm -rf EndlessAisleSampleData_${custom_object}_${site}
rm -rf EndlessAisle_${custom_object}_${site}

echo ""
echo "This script created two zip files."
echo ""
echo "  1. EndlessAisle_${custom_object}_${site}.zip – The system and custom object"
echo "     definition files, and the ${site} specific settings files."
echo "  2. EndlessAisleSampleData_${custom_object}_${site}.zip – The sample data"
echo "     files for ${site}."
echo ""
echo "Import into Business Manger > Administration > Site Development > Site Import &"
echo "Export. Use the files against your demo ${site} before you incorporate them"
echo "into your storefront."
echo ""