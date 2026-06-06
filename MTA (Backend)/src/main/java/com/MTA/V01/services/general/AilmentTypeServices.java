package com.MTA.V01.services.general;

import com.MTA.V01.models.AilmentType;
import com.MTA.V01.payload.requests.AddAilmentTypeRequest;
import com.MTA.V01.repositories.AilmentTypeRepository;
import com.MTA.V01.services.controllers.LogServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;



@Service
public class AilmentTypeServices {
    @Autowired
    AilmentTypeRepository ailmentTypeRepository;
    @Autowired
    LogServices logServices;
    @Autowired
    GeneralServices generalServices;

    //to find whole lists
    public List<AilmentType> searchAilmentTypeByNameNonProtected(String name){
        return ailmentTypeRepository.findByNameContainsIgnoreCaseAndIsProtectedFalse(name);
    }
    public List<AilmentType> searchAilmentTypeByName(String name){
        return ailmentTypeRepository.findByNameContainsIgnoreCaseAndIsProtectedTrue(name);
    }
    public List<AilmentType> findAllAilmentTypeNonProtected(){
        return ailmentTypeRepository.findByIsProtectedFalse();
    }
    public List<AilmentType> findAllAilmentType(){
        return ailmentTypeRepository.findAll();
    }

    //to get a single item
    public AilmentType findAilmentTypeById(Long id){
        if (!ailmentTypeRepository.existsById(id)){
            return null;
        }
        return ailmentTypeRepository.findById(id).get();
    }
    public AilmentType findAilmentTypeByIdProtected(Long id){
        if (!ailmentTypeRepository.existsByIdAndIsProtectedTrue(id)){
            return null;
        }
        return ailmentTypeRepository.findByIdAndIsProtectedTrue(id);
    }

    public String makeNewAilmentType(AddAilmentTypeRequest addAilmentTypeRequest){
        AilmentType ailmentType = new AilmentType(
                addAilmentTypeRequest.getName(),
                addAilmentTypeRequest.getAilmentDescription(),
                addAilmentTypeRequest.getIsProtected(),
                addAilmentTypeRequest.getIsPhysical());

        if (addAilmentTypeRequest.getIsCustom()!=null){
            ailmentType.setIsCustom(addAilmentTypeRequest.getIsCustom());
        }else {
            ailmentType.setIsCustom(true);
        }
        ailmentType.setUser(generalServices.getSelf());

        logServices.addLog("ailment type "+ailmentType+" added by user "+generalServices.getSelf());
        ailmentTypeRepository.save(ailmentType);
        return ("added ailment type "+ ailmentType);
    }

    public String updateAilmentType(Long id, AddAilmentTypeRequest addAilmentTypeRequest){
        if (!ailmentTypeRepository.existsById(id)){
            throw new RuntimeException("Ailment by id "+id+" doesn't exist");
        }

        AilmentType ailmentType = new AilmentType(
                addAilmentTypeRequest.getName(),
                addAilmentTypeRequest.getAilmentDescription(),
                addAilmentTypeRequest.getIsProtected(),
                addAilmentTypeRequest.getIsPhysical());

        if (addAilmentTypeRequest.getIsCustom()){
            ailmentType.setIsCustom(true);
        }
        ailmentType.setId(id);

        logServices.updateLog("ailment type "+ailmentType+" updated by user "+generalServices.getSelf());
        ailmentTypeRepository.save(ailmentType);
        return ("updated ailment" +id+" successfully" + ailmentType);
    }

    public List<AilmentType> findAllNonCustomAilmentTypes(){
        return ailmentTypeRepository.findByIsCustomFalse();
    }

    public List<AilmentType> findAllPersonalAilmentTypes(){
        return ailmentTypeRepository.findByUser_Id(generalServices.getSelf().getId());
    }

}
